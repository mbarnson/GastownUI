use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::fs::{self, File, OpenOptions};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, SeekFrom};
use tokio::sync::{Mutex, RwLock, Semaphore};
use uuid::Uuid;

/// Chunk size: 64MB
const CHUNK_SIZE: u64 = 64 * 1024 * 1024;
/// Maximum parallel downloads
const MAX_PARALLEL_DOWNLOADS: usize = 8;

/// Download status for a single file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadStatus {
    pub id: String,
    pub url: String,
    pub total_size: u64,
    pub downloaded: u64,
    pub progress: f32, // 0.0-100.0
    pub status: DownloadState,
    pub chunks_completed: usize,
    pub chunks_total: usize,
    pub error: Option<String>,
    pub sha256: Option<String>,
    pub output_path: String,
}

/// Download state enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DownloadState {
    Pending,
    Downloading,
    Paused,
    Verifying,
    Complete,
    Failed,
}

/// Chunk status for resume support
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ChunkStatus {
    index: usize,
    start: u64,
    end: u64,
    downloaded: u64,
    complete: bool,
    sha256: Option<String>,
}

/// Progress file for resume support
#[derive(Debug, Clone, Serialize, Deserialize)]
struct DownloadProgress {
    id: String,
    url: String,
    total_size: u64,
    expected_sha256: Option<String>,
    chunks: Vec<ChunkStatus>,
    created_at: String,
    updated_at: String,
}

/// Active download info
struct ActiveDownload {
    status: DownloadStatus,
    progress: DownloadProgress,
    cancel_flag: Arc<RwLock<bool>>,
}

/// Download manager state
pub struct DownloadManagerState {
    downloads: Arc<RwLock<HashMap<String, ActiveDownload>>>,
    client: Client,
    download_dir: PathBuf,
    semaphore: Arc<Semaphore>,
}

impl Default for DownloadManagerState {
    fn default() -> Self {
        let download_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("gastownui")
            .join("downloads");

        Self {
            downloads: Arc::new(RwLock::new(HashMap::new())),
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(300))
                .build()
                .expect("Failed to create HTTP client"),
            download_dir,
            semaphore: Arc::new(Semaphore::new(MAX_PARALLEL_DOWNLOADS)),
        }
    }
}

impl DownloadManagerState {
    /// Get the progress file path for a download
    fn progress_path(&self, id: &str) -> PathBuf {
        self.download_dir.join(format!("{}.progress.json", id))
    }

    /// Get the partial download path
    fn partial_path(&self, id: &str) -> PathBuf {
        self.download_dir.join(format!("{}.partial", id))
    }

    /// Load progress from file for resume
    async fn load_progress(&self, id: &str) -> Option<DownloadProgress> {
        let path = self.progress_path(id);
        if let Ok(content) = fs::read_to_string(&path).await {
            serde_json::from_str(&content).ok()
        } else {
            None
        }
    }

    /// Save progress to file
    async fn save_progress(&self, progress: &DownloadProgress) -> Result<(), String> {
        let path = self.progress_path(&progress.id);
        let content =
            serde_json::to_string_pretty(progress).map_err(|e| format!("Serialize error: {}", e))?;
        fs::write(&path, content)
            .await
            .map_err(|e| format!("Write error: {}", e))
    }
}

/// Start or resume a chunked download
#[tauri::command]
pub async fn start_chunked_download(
    app: AppHandle,
    state: State<'_, DownloadManagerState>,
    url: String,
    output_path: String,
    expected_sha256: Option<String>,
) -> Result<String, String> {
    // Ensure download directory exists
    fs::create_dir_all(&state.download_dir)
        .await
        .map_err(|e| format!("Failed to create download directory: {}", e))?;

    // Generate or reuse download ID
    let id = Uuid::new_v4().to_string();

    // Get file size with HEAD request
    let head_resp = state
        .client
        .head(&url)
        .send()
        .await
        .map_err(|e| format!("HEAD request failed: {}", e))?;

    let total_size = head_resp
        .headers()
        .get(reqwest::header::CONTENT_LENGTH)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .ok_or("Server did not provide Content-Length")?;

    // Check if server supports range requests
    let supports_range = head_resp
        .headers()
        .get(reqwest::header::ACCEPT_RANGES)
        .map(|v| v.to_str().unwrap_or("") == "bytes")
        .unwrap_or(false);

    if !supports_range {
        return Err("Server does not support range requests".into());
    }

    // Calculate chunks
    let num_chunks = ((total_size + CHUNK_SIZE - 1) / CHUNK_SIZE) as usize;
    let chunks: Vec<ChunkStatus> = (0..num_chunks)
        .map(|i| {
            let start = i as u64 * CHUNK_SIZE;
            let end = std::cmp::min(start + CHUNK_SIZE - 1, total_size - 1);
            ChunkStatus {
                index: i,
                start,
                end,
                downloaded: 0,
                complete: false,
                sha256: None,
            }
        })
        .collect();

    // Create progress tracking
    let progress = DownloadProgress {
        id: id.clone(),
        url: url.clone(),
        total_size,
        expected_sha256: expected_sha256.clone(),
        chunks,
        created_at: chrono_now(),
        updated_at: chrono_now(),
    };

    // Save initial progress
    state.save_progress(&progress).await?;

    // Create status
    let status = DownloadStatus {
        id: id.clone(),
        url: url.clone(),
        total_size,
        downloaded: 0,
        progress: 0.0,
        status: DownloadState::Downloading,
        chunks_completed: 0,
        chunks_total: num_chunks,
        error: None,
        sha256: expected_sha256.clone(),
        output_path: output_path.clone(),
    };

    // Store active download
    let active = ActiveDownload {
        status: status.clone(),
        progress,
        cancel_flag: Arc::new(RwLock::new(false)),
    };

    state.downloads.write().await.insert(id.clone(), active);

    // Emit initial status first (before moving app into spawn)
    app.emit("download-started", &status)
        .map_err(|e| format!("Emit error: {}", e))?;

    // Start download task
    let downloads = state.downloads.clone();
    let client = state.client.clone();
    let semaphore = state.semaphore.clone();
    let download_dir = state.download_dir.clone();
    let id_clone = id.clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        let result = download_file(
            &app_clone,
            downloads.clone(),
            client,
            semaphore,
            &download_dir,
            &id_clone,
            &url,
            &output_path,
            total_size,
            expected_sha256,
        )
        .await;

        if let Err(e) = result {
            let mut downloads = downloads.write().await;
            if let Some(download) = downloads.get_mut(&id_clone) {
                download.status.status = DownloadState::Failed;
                download.status.error = Some(e.clone());
            }
            let _ = app_clone.emit("download-error", (&id_clone, e));
        }
    });

    Ok(id)
}

/// Pause a download
#[tauri::command]
pub async fn pause_download(
    state: State<'_, DownloadManagerState>,
    id: String,
) -> Result<(), String> {
    let mut downloads = state.downloads.write().await;
    if let Some(download) = downloads.get_mut(&id) {
        *download.cancel_flag.write().await = true;
        download.status.status = DownloadState::Paused;
        state.save_progress(&download.progress).await?;
        Ok(())
    } else {
        Err("Download not found".into())
    }
}

/// Resume a paused download
#[tauri::command]
pub async fn resume_download(
    app: AppHandle,
    state: State<'_, DownloadManagerState>,
    id: String,
) -> Result<(), String> {
    // Load progress from file
    let progress = state
        .load_progress(&id)
        .await
        .ok_or("No progress file found")?;

    let downloads = state.downloads.clone();
    let client = state.client.clone();
    let semaphore = state.semaphore.clone();
    let download_dir = state.download_dir.clone();

    let status = DownloadStatus {
        id: id.clone(),
        url: progress.url.clone(),
        total_size: progress.total_size,
        downloaded: progress.chunks.iter().map(|c| c.downloaded).sum(),
        progress: 0.0,
        status: DownloadState::Downloading,
        chunks_completed: progress.chunks.iter().filter(|c| c.complete).count(),
        chunks_total: progress.chunks.len(),
        error: None,
        sha256: progress.expected_sha256.clone(),
        output_path: "".into(), // Will be set from stored state
    };

    // Store active download
    let active = ActiveDownload {
        status: status.clone(),
        progress: progress.clone(),
        cancel_flag: Arc::new(RwLock::new(false)),
    };

    downloads.write().await.insert(id.clone(), active);

    // Resume download
    tokio::spawn(async move {
        let result = download_file(
            &app,
            downloads.clone(),
            client,
            semaphore,
            &download_dir,
            &id,
            &progress.url,
            "", // output path not needed for resume
            progress.total_size,
            progress.expected_sha256,
        )
        .await;

        if let Err(e) = result {
            let mut downloads = downloads.write().await;
            if let Some(download) = downloads.get_mut(&id) {
                download.status.status = DownloadState::Failed;
                download.status.error = Some(e.clone());
            }
            let _ = app.emit("download-error", (&id, e));
        }
    });

    Ok(())
}

/// Cancel a download
#[tauri::command]
pub async fn cancel_download(
    state: State<'_, DownloadManagerState>,
    id: String,
) -> Result<(), String> {
    let mut downloads = state.downloads.write().await;
    if let Some(download) = downloads.get_mut(&id) {
        *download.cancel_flag.write().await = true;
        download.status.status = DownloadState::Failed;
        download.status.error = Some("Cancelled by user".into());

        // Clean up files
        let _ = fs::remove_file(state.progress_path(&id)).await;
        let _ = fs::remove_file(state.partial_path(&id)).await;
    }
    downloads.remove(&id);
    Ok(())
}

/// Get download status
#[tauri::command]
pub async fn get_download_status(
    state: State<'_, DownloadManagerState>,
    id: String,
) -> Result<DownloadStatus, String> {
    let downloads = state.downloads.read().await;
    downloads
        .get(&id)
        .map(|d| d.status.clone())
        .ok_or("Download not found".into())
}

/// List all downloads
#[tauri::command]
pub async fn list_downloads(
    state: State<'_, DownloadManagerState>,
) -> Result<Vec<DownloadStatus>, String> {
    let downloads = state.downloads.read().await;
    Ok(downloads.values().map(|d| d.status.clone()).collect())
}

/// Download file with parallel chunk downloads
async fn download_file(
    app: &AppHandle,
    downloads: Arc<RwLock<HashMap<String, ActiveDownload>>>,
    client: Client,
    semaphore: Arc<Semaphore>,
    download_dir: &PathBuf,
    id: &str,
    url: &str,
    output_path: &str,
    total_size: u64,
    expected_sha256: Option<String>,
) -> Result<(), String> {
    let partial_path = download_dir.join(format!("{}.partial", id));

    // Create partial file with correct size
    {
        let file = File::create(&partial_path)
            .await
            .map_err(|e| format!("Create file error: {}", e))?;
        file.set_len(total_size)
            .await
            .map_err(|e| format!("Set length error: {}", e))?;
    }

    // Get chunks to download
    let chunks_to_download = {
        let downloads = downloads.read().await;
        let download = downloads.get(id).ok_or("Download not found")?;
        download
            .progress
            .chunks
            .iter()
            .filter(|c| !c.complete)
            .cloned()
            .collect::<Vec<_>>()
    };

    // Download chunks in parallel
    let file = Arc::new(Mutex::new(
        OpenOptions::new()
            .write(true)
            .open(&partial_path)
            .await
            .map_err(|e| format!("Open file error: {}", e))?,
    ));

    let mut handles = vec![];

    for chunk in chunks_to_download {
        let client = client.clone();
        let url = url.to_string();
        let file = file.clone();
        let downloads = downloads.clone();
        let id = id.to_string();
        let app = app.clone();
        let semaphore = semaphore.clone();

        let handle = tokio::spawn(async move {
            // Acquire semaphore permit
            let _permit = semaphore.acquire().await.map_err(|e| e.to_string())?;

            // Check cancel flag
            {
                let downloads = downloads.read().await;
                if let Some(download) = downloads.get(&id) {
                    if *download.cancel_flag.read().await {
                        return Err("Cancelled".to_string());
                    }
                }
            }

            // Download chunk with range request
            let range = format!("bytes={}-{}", chunk.start, chunk.end);
            let resp = client
                .get(&url)
                .header(reqwest::header::RANGE, &range)
                .send()
                .await
                .map_err(|e| format!("Request error: {}", e))?;

            if !resp.status().is_success() {
                return Err(format!("HTTP error: {}", resp.status()));
            }

            let mut stream = resp.bytes_stream();
            let mut offset = chunk.start;
            let mut chunk_downloaded = 0u64;

            while let Some(bytes) = stream.next().await {
                let bytes = bytes.map_err(|e| format!("Stream error: {}", e))?;

                // Write to file at correct offset
                {
                    let mut file = file.lock().await;
                    file.seek(SeekFrom::Start(offset))
                        .await
                        .map_err(|e| format!("Seek error: {}", e))?;
                    file.write_all(&bytes)
                        .await
                        .map_err(|e| format!("Write error: {}", e))?;
                }

                offset += bytes.len() as u64;
                chunk_downloaded += bytes.len() as u64;

                // Update progress
                {
                    let mut downloads = downloads.write().await;
                    if let Some(download) = downloads.get_mut(&id) {
                        download.status.downloaded += bytes.len() as u64;
                        download.status.progress = (download.status.downloaded as f32
                            / download.status.total_size as f32)
                            * 100.0;

                        // Emit progress event
                        let _ = app.emit("download-progress", &download.status);
                    }
                }
            }

            // Mark chunk complete
            {
                let mut downloads = downloads.write().await;
                if let Some(download) = downloads.get_mut(&id) {
                    if let Some(chunk_status) = download
                        .progress
                        .chunks
                        .iter_mut()
                        .find(|c| c.index == chunk.index)
                    {
                        chunk_status.complete = true;
                        chunk_status.downloaded = chunk_downloaded;
                    }
                    download.status.chunks_completed += 1;
                }
            }

            Ok::<_, String>(())
        });

        handles.push(handle);
    }

    // Wait for all chunks
    for handle in handles {
        handle
            .await
            .map_err(|e| format!("Join error: {}", e))?
            .map_err(|e| e)?;
    }

    // Verify SHA256 if provided
    if let Some(expected) = expected_sha256 {
        {
            let mut downloads = downloads.write().await;
            if let Some(download) = downloads.get_mut(id) {
                download.status.status = DownloadState::Verifying;
            }
        }
        app.emit("download-verifying", id)
            .map_err(|e| format!("Emit error: {}", e))?;

        let actual = compute_sha256(&partial_path).await?;
        if actual.to_lowercase() != expected.to_lowercase() {
            return Err(format!(
                "SHA256 mismatch: expected {}, got {}",
                expected, actual
            ));
        }
    }

    // Move to final location
    let final_path = if output_path.is_empty() {
        let downloads = downloads.read().await;
        downloads
            .get(id)
            .map(|d| d.status.output_path.clone())
            .unwrap_or_else(|| partial_path.to_string_lossy().to_string())
    } else {
        output_path.to_string()
    };

    if !final_path.is_empty() {
        fs::rename(&partial_path, &final_path)
            .await
            .map_err(|e| format!("Rename error: {}", e))?;
    }

    // Update status to complete
    {
        let mut downloads = downloads.write().await;
        if let Some(download) = downloads.get_mut(id) {
            download.status.status = DownloadState::Complete;
            download.status.progress = 100.0;
        }
    }

    // Clean up progress file
    let progress_path = download_dir.join(format!("{}.progress.json", id));
    let _ = fs::remove_file(&progress_path).await;

    app.emit("download-complete", id)
        .map_err(|e| format!("Emit error: {}", e))?;

    Ok(())
}

/// Compute SHA256 hash of a file
async fn compute_sha256(path: &PathBuf) -> Result<String, String> {
    let mut file = File::open(path)
        .await
        .map_err(|e| format!("Open error: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536]; // 64KB buffer

    loop {
        let n = file
            .read(&mut buffer)
            .await
            .map_err(|e| format!("Read error: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

/// Get current timestamp as ISO string
fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}

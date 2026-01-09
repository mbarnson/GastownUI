#!/usr/bin/env npx ts-node

/**
 * FTUE Voice Clip Generator
 *
 * Generates pre-baked voice clips for the First-Time User Experience
 * using LFM2.5-Audio model via the llama-liquid-audio-server HTTP API.
 *
 * Usage:
 *   npx ts-node scripts/generate-ftue-voice.ts [--dry-run] [--clip <id>]
 *
 * Requirements:
 *   - LFM2.5-Audio model server running on http://127.0.0.1:8080
 *   - ffmpeg for audio normalization (optional, will skip if not found)
 *
 * To start the voice server:
 *   See: src-tauri/src/voice.rs for server startup command
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

interface VoiceClip {
  id: string;
  filename: string;
  script: string;
  duration: number | null;
  generated: boolean;
}

interface Manifest {
  version: string;
  description: string;
  model: string;
  format: string;
  sampleRate: number;
  channels: number;
  normalization: {
    targetLUFS: number;
    truePeak: number;
  };
  clips: VoiceClip[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_DIR = __dirname;
const MANIFEST_PATH = join(SCRIPT_DIR, '../public/assets/voice/ftue/manifest.json');
const OUTPUT_DIR = join(SCRIPT_DIR, '../public/assets/voice/ftue');

// LFM2.5 voice server URL (matches voice.rs default)
const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL || 'http://127.0.0.1:8080';
// LFM2.5 requires specific voice prompts. Available options:
// - Perform TTS. Use the US male voice.
// - Perform TTS. Use the UK male voice.
// - Perform TTS. Use the US female voice.
// - Perform TTS. Use the UK female voice.
const TTS_SYSTEM_PROMPT = 'Perform TTS. Use the US female voice.';

async function loadManifest(): Promise<Manifest> {
  const content = readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(content) as Manifest;
}

async function saveManifest(manifest: Manifest): Promise<void> {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function checkServerHealth(): Promise<boolean> {
  try {
    // LFM2.5 server doesn't have /health endpoint, check if server responds at all
    const response = await fetch(`${VOICE_SERVER_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: '',
        messages: [
          { role: 'system', content: TTS_SYSTEM_PROMPT },
          { role: 'user', content: 'test' },
        ],
        stream: true,
        max_tokens: 1,
      }),
    });
    // Server responds even on error - we just want to check it's running
    return true;
  } catch {
    return false;
  }
}

async function synthesizeVoice(script: string): Promise<Buffer> {
  const apiUrl = `${VOICE_SERVER_URL}/v1/chat/completions`;

  const payload = {
    model: '',
    messages: [
      { role: 'system', content: TTS_SYSTEM_PROMPT },
      { role: 'user', content: script },
    ],
    stream: true,  // LFM2.5 only supports streaming mode
    max_tokens: 2048,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Server error ${response.status}: ${body}`);
  }

  // Collect all audio chunks from streaming response
  const audioChunks: Buffer[] = [];
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;

      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);

        // Check for error
        if (parsed.error) {
          throw new Error(`Server error: ${parsed.error.message}`);
        }

        // Extract audio chunk
        const audioData = parsed?.choices?.[0]?.delta?.audio_chunk?.data;
        if (audioData) {
          audioChunks.push(Buffer.from(audioData, 'base64'));
        }
      } catch (e) {
        // Skip parsing errors for non-JSON lines
        if (data !== '' && !data.startsWith('{')) continue;
        throw e;
      }
    }
  }

  if (audioChunks.length === 0) {
    throw new Error('No audio data received');
  }

  // Concatenate all chunks
  return Buffer.concat(audioChunks);
}

function hasFFmpeg(): boolean {
  try {
    execSync('which ffmpeg', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function createWavHeader(dataLength: number, sampleRate: number, channels: number): Buffer {
  // 16-bit PCM WAV header
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2; // 16-bit = 2 bytes
  const blockAlign = channels * 2;

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4); // File size - 8
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

function convertToWav(pcmBuffer: Buffer, sampleRate: number, channels: number): Buffer {
  const header = createWavHeader(pcmBuffer.length, sampleRate, channels);
  return Buffer.concat([header, pcmBuffer]);
}

function normalizeAudio(
  inputPath: string,
  outputPath: string,
  targetLUFS: number,
  truePeak: number
): boolean {
  if (!hasFFmpeg()) {
    console.log('  ffmpeg not found, skipping normalization');
    return false;
  }

  try {
    const cmd = `ffmpeg -i "${inputPath}" -af "loudnorm=I=${targetLUFS}:TP=${truePeak}:LRA=11" -ar 24000 -ac 1 "${outputPath}" -y 2>/dev/null`;
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.log(`  normalization failed: ${(error as Error).message}`);
    return false;
  }
}

function getAudioDuration(filePath: string): number | null {
  if (!hasFFmpeg()) {
    return null;
  }

  try {
    const result = execSync(
      `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`,
      { encoding: 'utf-8' }
    ).trim();
    return parseFloat(result);
  } catch {
    return null;
  }
}

async function generateClip(
  clip: VoiceClip,
  manifest: Manifest,
  dryRun: boolean
): Promise<boolean> {
  const outputPath = join(OUTPUT_DIR, clip.filename);

  console.log(`\nGenerating: ${clip.id}`);
  console.log(`  Script: "${clip.script.substring(0, 60)}..."`);

  if (dryRun) {
    console.log('  [DRY RUN] Would synthesize and save to:', outputPath);
    return true;
  }

  try {
    // Synthesize audio (returns raw PCM)
    const pcmBuffer = await synthesizeVoice(clip.script);
    console.log(`  Received ${pcmBuffer.length} bytes of audio`);

    // Convert to WAV
    const wavBuffer = convertToWav(pcmBuffer, manifest.sampleRate, manifest.channels);

    // Save raw WAV
    const rawPath = outputPath.replace('.wav', '_raw.wav');
    writeFileSync(rawPath, wavBuffer);

    // Try to normalize, fall back to raw if ffmpeg unavailable
    if (normalizeAudio(rawPath, outputPath, manifest.normalization.targetLUFS, manifest.normalization.truePeak)) {
      // Clean up raw file
      try {
        execSync(`rm "${rawPath}"`, { stdio: 'pipe' });
      } catch {}
      console.log('  Normalized:', outputPath);
    } else {
      // Use raw file as output
      if (rawPath !== outputPath) {
        execSync(`mv "${rawPath}" "${outputPath}"`, { stdio: 'pipe' });
      }
      console.log('  Saved (unnormalized):', outputPath);
    }

    // Get duration
    clip.duration = getAudioDuration(outputPath);
    if (clip.duration) {
      console.log(`  Duration: ${clip.duration.toFixed(2)}s`);
    }

    return true;
  } catch (error) {
    console.error(`  FAILED: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const clipIdIndex = args.indexOf('--clip');
  const targetClipId = clipIdIndex >= 0 ? args[clipIdIndex + 1] : null;

  console.log('=== FTUE Voice Clip Generator ===\n');

  if (dryRun) {
    console.log('Running in DRY RUN mode - no files will be generated\n');
  }

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load manifest
  const manifest = await loadManifest();
  console.log(`Loaded manifest v${manifest.version}`);
  console.log(`Model: ${manifest.model}`);
  console.log(`Sample Rate: ${manifest.sampleRate}Hz, Channels: ${manifest.channels}`);
  console.log(`Total clips: ${manifest.clips.length}`);

  // Check server health
  if (!dryRun) {
    console.log(`\nChecking voice server at ${VOICE_SERVER_URL}...`);
    const healthy = await checkServerHealth();
    if (!healthy) {
      console.error('\nERROR: Voice server not available!');
      console.error('Start the LFM2.5 voice server first.');
      console.error('\nHint: Use the GastownUI app to start the voice server,');
      console.error('or run llama-liquid-audio-server directly from:');
      console.error('~/.cache/huggingface/models/LFM2.5-Audio-1.5B-GGUF/runners/');
      process.exit(1);
    }
    console.log('Voice server is ready!');
  }

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const clip of manifest.clips) {
    // Filter to specific clip if requested
    if (targetClipId && clip.id !== targetClipId) {
      continue;
    }

    if (clip.generated && !targetClipId) {
      console.log(`\nSkipping: ${clip.id} (already generated)`);
      skipped++;
      continue;
    }

    const success = await generateClip(clip, manifest, dryRun);
    if (success) {
      clip.generated = true;
      generated++;
    } else {
      failed++;
    }
  }

  // Save updated manifest
  if (!dryRun && generated > 0) {
    await saveManifest(manifest);
    console.log('\nManifest updated.');
  }

  console.log('\n=== Summary ===');
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);

  if (targetClipId) {
    const clip = manifest.clips.find((c) => c.id === targetClipId);
    if (!clip) {
      console.error(`\nClip not found: ${targetClipId}`);
      console.log('Available clips:', manifest.clips.map((c) => c.id).join(', '));
    }
  }

  // Calculate total duration
  const totalDuration = manifest.clips
    .filter((c) => c.duration != null)
    .reduce((sum, c) => sum + (c.duration || 0), 0);

  if (totalDuration > 0) {
    console.log(`\nTotal audio duration: ${totalDuration.toFixed(2)}s (~${Math.ceil(totalDuration / 60)} min)`);
  }
}

main().catch(console.error);

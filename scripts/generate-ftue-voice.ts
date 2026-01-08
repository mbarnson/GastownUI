#!/usr/bin/env npx ts-node

/**
 * FTUE Voice Clip Generator
 *
 * Generates pre-baked voice clips for the First-Time User Experience
 * using LFM2.5-Audio model via the Tauri backend.
 *
 * Usage:
 *   npx ts-node scripts/generate-ftue-voice.ts
 *
 * Requirements:
 *   - LFM2.5-Audio-1.5B-GGUF model in models/ directory
 *   - Tauri backend running with voice endpoint
 *   - ffmpeg for audio normalization
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
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

const MANIFEST_PATH = join(__dirname, '../public/assets/voice/ftue/manifest.json');
const OUTPUT_DIR = join(__dirname, '../public/assets/voice/ftue');
const TAURI_VOICE_ENDPOINT = 'http://localhost:3030/voice/synthesize';

async function loadManifest(): Promise<Manifest> {
  const content = readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(content) as Manifest;
}

async function saveManifest(manifest: Manifest): Promise<void> {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function synthesizeVoice(script: string): Promise<Buffer> {
  // TODO: Connect to Tauri backend when available
  // For now, this is a placeholder that would call the LFM2.5 model
  console.log(`  Synthesizing: "${script.substring(0, 50)}..."`);

  // Placeholder: In production, this would call:
  // const response = await fetch(TAURI_VOICE_ENDPOINT, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ text: script }),
  // });
  // return Buffer.from(await response.arrayBuffer());

  throw new Error(
    'Voice synthesis requires LFM2.5 model. Run with Tauri backend.'
  );
}

function normalizeAudio(
  inputPath: string,
  outputPath: string,
  targetLUFS: number,
  truePeak: number
): void {
  // Use ffmpeg to normalize audio levels
  const cmd = `ffmpeg -i "${inputPath}" -af "loudnorm=I=${targetLUFS}:TP=${truePeak}:LRA=11" -ar 24000 -ac 1 "${outputPath}" -y`;
  execSync(cmd, { stdio: 'pipe' });
}

async function generateClip(
  clip: VoiceClip,
  manifest: Manifest
): Promise<boolean> {
  const outputPath = join(OUTPUT_DIR, clip.filename);

  console.log(`Generating: ${clip.id}`);

  try {
    // Synthesize audio
    const audioBuffer = await synthesizeVoice(clip.script);

    // Save raw audio
    const rawPath = outputPath.replace('.wav', '_raw.wav');
    writeFileSync(rawPath, audioBuffer);

    // Normalize audio levels
    normalizeAudio(
      rawPath,
      outputPath,
      manifest.normalization.targetLUFS,
      manifest.normalization.truePeak
    );

    // Clean up raw file
    execSync(`rm "${rawPath}"`);

    console.log(`  Generated: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`  Failed: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  console.log('=== FTUE Voice Clip Generator ===\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load manifest
  const manifest = await loadManifest();
  console.log(`Loaded manifest v${manifest.version}`);
  console.log(`Model: ${manifest.model}`);
  console.log(`Clips to generate: ${manifest.clips.length}\n`);

  let generated = 0;
  let failed = 0;

  for (const clip of manifest.clips) {
    if (clip.generated) {
      console.log(`Skipping: ${clip.id} (already generated)`);
      continue;
    }

    const success = await generateClip(clip, manifest);
    if (success) {
      clip.generated = true;
      generated++;
    } else {
      failed++;
    }
  }

  // Save updated manifest
  await saveManifest(manifest);

  console.log('\n=== Summary ===');
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Already done: ${manifest.clips.filter((c) => c.generated).length}`);
}

main().catch(console.error);

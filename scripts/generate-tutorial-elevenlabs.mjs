#!/usr/bin/env node
/**
 * AstroQuest tutorial voice exporter — ElevenLabs Jessica / Eleven v4.
 *
 * Runs on a developer's computer ONLY. No API keys go into the website or Git.
 *   node scripts/generate-tutorial-elevenlabs.mjs --dry-run
 *   ELEVENLABS_API_KEY=... node scripts/generate-tutorial-elevenlabs.mjs --status
 *   ELEVENLABS_API_KEY=... node scripts/generate-tutorial-elevenlabs.mjs --all
 *
 * This exporter resumes safely: verified recordings and matching manifest text are
 * skipped, including the approved user-supplied first recording (menu-01.mp3).
 * It checks that an account is on the Free tier and that sufficient quota remains
 * before making ANY generation request. If quota is insufficient, it stops.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { TUTORIAL_STEPS } from '../src/ui/v4/tutorialGuide.js';
import { narrationForTutorialStep, tutorialAudioFileName } from '../src/ui/v4/tutorialVoice.js';

export const CONFIG = Object.freeze({
  voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica — official ElevenLabs default voice
  voiceName: 'Jessica - Playful, Bright, Warm',
  modelId: 'eleven_v4',
  outputFormat: 'mp3_44100_128',
  stability: 0.5,
  similarityBoost: 0.75,
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'tutorial-audio');
const manifestPath = path.join(outDir, 'manifest.json');
const apiRoot = 'https://api.elevenlabs.io/v1';
const clips = Object.entries(TUTORIAL_STEPS).flatMap(([stage, steps]) => steps.map((step, index) => ({
  stage, index, file: tutorialAudioFileName(stage, index), text: narrationForTutorialStep(step),
})));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const status = args.includes('--status');
const all = args.includes('--all');
const one = args.find(arg => arg.startsWith('--one='))?.slice('--one='.length);
const key = process.env.ELEVENLABS_API_KEY?.trim();

async function getManifest() {
  try { return JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return {version:1,clips:[]};
    throw new Error('The existing manifest.json is corrupt; do not overwrite it: ' + error.message);
  }
}
async function isMp3(file) {
  try {
    const buffer = await readFile(file);
    return buffer.length > 1000 && (
      buffer.subarray(0,3).toString('ascii') === 'ID3' ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    );
  } catch { return false; }
}
function validManifest(manifest) {
  if (manifest.version !== 1 || !Array.isArray(manifest.clips)) throw new Error('Invalid existing tutorial audio manifest.');
  if (manifest.voiceId && manifest.voiceId !== CONFIG.voiceId) throw new Error('The manifest references a DIFFERENT voice. Refusing to mix narrators.');
  if (manifest.modelId && manifest.modelId !== CONFIG.modelId) throw new Error('The manifest references a DIFFERENT model. Refusing to mix narration models.');
}
function remainingUsage(info) {
  // Keep strict accounting: credits are generally approximately one per character
  // for v4. API account metadata is authoritative for the remaining allowance.
  if (!Number.isInteger(info?.character_limit) || !Number.isInteger(info?.character_count)) {
    throw new Error('Could not verify the remaining free allowance; refusing unmetered generation.');
  }
  return Math.max(0, info.character_limit - info.character_count);
}
async function callApi(endpoint, init={}) {
  const res = await fetch(apiRoot + endpoint, { ...init, headers: {
    'xi-api-key': key, ...init.headers,
  }});
  if (!res.ok) {
    const text = await res.text();
    // Never log headers, API keys, or full remote responses.
    throw new Error(`ElevenLabs HTTP ${res.status}: ${text.slice(0,320).replaceAll(key ?? '___', '[redacted]')}`);
  }
  return res;
}
async function writeManifest(manifest) {
  await mkdir(outDir, {recursive: true});
  const tmp = manifestPath + `.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(manifest,null,2) + '\n', 'utf8');
  await rename(tmp, manifestPath);
}

async function main() {
  if (!dryRun && !status && !all && !one) {
    throw new Error('Choose --dry-run, --status, --one=stage:index, or --all.');
  }
  const manifest = await getManifest();
  validManifest(manifest);
  const completed = [];
  const pending = [];
  for (const clip of clips) {
    const match = manifest.clips.find(c => c.stage === clip.stage && c.index === clip.index && c.file === clip.file);
    if (match && match.text === clip.text && await isMp3(path.join(outDir,clip.file))) completed.push(clip);
    else pending.push(clip);
  }
  const pendingCharacters = pending.reduce((count, clip) => count + clip.text.length, 0);
  console.log(`AstroQuest narrator: ${CONFIG.voiceName} (${CONFIG.modelId})`);
  console.log(`${clips.length} tips total; ${completed.length} complete, ${pending.length} missing; about ${pendingCharacters} characters needed.`);
  if (dryRun) {
    for (const clip of pending) console.log(`  ${clip.stage}:${clip.index}  ${clip.file}  ${clip.text.length} characters  ${clip.text.slice(0,52)}`);
    console.log('Dry run only: no API requests or credits used.');
    return;
  }
  if (!key) throw new Error('Set ELEVENLABS_API_KEY privately in your terminal environment, then run again. Never place it in a Git-tracked file or browser app.');
  const subscription = await (await callApi('/user/subscription')).json();
  if (String(subscription.tier).toLowerCase() !== 'free') {
    throw new Error(`This project is set to free-tier-only generation; your account reports tier '${subscription.tier}'. No speech requests were sent.`);
  }
  const available = remainingUsage(subscription);
  console.log(`Verified Free tier. Remaining allowance: ${available} credits/characters (current account report).`);
  if (status) return;

  const selected = one ? pending.filter(c=>`${c.stage}:${c.index}`===one) : pending;
  if (one && !clips.some(c=>`${c.stage}:${c.index}`===one)) throw new Error(`Unknown tip '${one}'. Try --dry-run.`);
  if (one && !selected.length) { console.log('Selected recording is already present and valid; nothing to generate.'); return; }
  if (!selected.length) { console.log('All narration clips already exist!'); return; }
  const cost = selected.reduce((count,c) => count + c.text.length, 0);
  // Deliberately conservative; charge must fit Free allowance and some margin.
  const safetyMargin = 100;
  if (available < cost + safetyMargin) {
    throw new Error(`Insufficient free-tier quota: need at least ${cost + safetyMargin}, have ${available}. No speech requests were sent. Use fewer tips (--one=stage:index), or wait for credits to reset.`);
  }
  await mkdir(outDir, {recursive:true});
  const saved = new Map(manifest.clips.map(c=>[c.file,c]));
  for (const [index, clip] of selected.entries()) {
    console.log(`Generating ${index+1}/${selected.length}: ${clip.file}`);
    const body={
      text:clip.text,
      model_id:CONFIG.modelId,
      voice_settings:{stability:CONFIG.stability,similarity_boost:CONFIG.similarityBoost},
    };
    const response=await callApi(`/text-to-speech/${CONFIG.voiceId}?output_format=${CONFIG.outputFormat}`,{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),
    });
    const audio=Buffer.from(await response.arrayBuffer());
    if (audio.length < 1000 || !(
      audio.subarray(0,3).toString('ascii') === 'ID3' ||
      (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0)
    )) throw new Error(`Unexpected audio response for ${clip.file}; stopping to avoid wasting credits.`);
    const p=path.join(outDir,clip.file);
    const tmp=p+`.tmp-${process.pid}`;
    await writeFile(tmp,audio);
    await rename(tmp,p);
    saved.set(clip.file,{...clip,source:'ElevenLabs API'});
    await writeManifest({
      version:1,engine:'ElevenLabs',voiceName:CONFIG.voiceName,voiceId:CONFIG.voiceId,
      modelId:CONFIG.modelId,voiceSettings:{stability:CONFIG.stability,similarity_boost:CONFIG.similarityBoost},
      clips:[...saved.values()].sort((a,b)=>a.file.localeCompare(b.file)),
    });
    console.log(`  Saved ${clip.file}; future runs will skip it.`);
  }
  console.log('Finished generating selected tips. Listen to samples before publishing the clips.');
}

main().catch(error => { console.error('Cannot continue:',error.message); process.exitCode=1; });

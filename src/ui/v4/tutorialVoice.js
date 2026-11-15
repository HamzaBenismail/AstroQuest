/** Generated audio scripts and local playback preferences; no browser synthesis. */
export const TUTORIAL_VOICE_STORAGE_KEY = 'astroquest.tutorial.neural.v1';
export const VOICE_SPEEDS = Object.freeze([0.9, 1, 1.1]);

export function normalizeVoicePreferences(input) {
  const source = input && typeof input === 'object' ? input : {};
  const rate = Number(source.rate);
  return { enabled: source.enabled === true, rate: VOICE_SPEEDS.includes(rate) ? rate : 1 };
}
export function readVoicePreferences(storage) {
  try { return normalizeVoicePreferences(JSON.parse(storage?.getItem(TUTORIAL_VOICE_STORAGE_KEY) ?? 'null')); }
  catch { return normalizeVoicePreferences(null); }
}
export function writeVoicePreferences(storage, values) {
  const prefs = normalizeVoicePreferences(values);
  try { storage?.setItem(TUTORIAL_VOICE_STORAGE_KEY, JSON.stringify(prefs)); }
  catch { /* private / unavailable storage */ }
  return prefs;
}
export function narrationForTutorialStep(step) {
  if (!step) return '';
  const title = String(step.title || '').trim();
  const text = String(step.text || '').trim();
  const prefix = title ? (/[.!?]$/.test(title) ? title : `${title}.`) : '';
  return [prefix, text].filter(Boolean).join('  ');
}

export const TUTORIAL_AUDIO_BASE = '/tutorial-audio/';
export function tutorialAudioFileName(stage, index) {
  if (!/^[a-z]+$/.test(stage) || !Number.isInteger(index) || index < 0 || index > 99) return null;
  return `${stage}-${String(index + 1).padStart(2, '0')}.mp3`;
}
export function validatedTutorialAudio(manifest, stage, index, step) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.clips)) return null;
  const name = tutorialAudioFileName(stage, index);
  const entry = manifest.clips.find(clip => clip.stage === stage && clip.index === index && clip.file === name);
  if (!entry || entry.text !== narrationForTutorialStep(step)) return null;
  return TUTORIAL_AUDIO_BASE + name;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { readVoicePreferences, writeVoicePreferences, validatedTutorialAudio } from './tutorialVoice.js';

function browserStorage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null; }
  catch { return null; }
}
function audioSupported() { return typeof window !== 'undefined' && typeof window.Audio === 'function'; }

/** Plays authored MP3 files only. No speechSynthesis fallback: voice quality is consistent. */
export function useTutorialNarrator(step, stage, stepIndex) {
  const [preferences, setPreferences] = useState(() => readVoicePreferences(browserStorage()));
  const [manifest, setManifest] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');
  const audioRef = useRef(null);
  const skipAutoRef = useRef(null);
  const serial = useRef(0);
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;
  const key = `${stage}:${stepIndex}`;
  const asset = validatedTutorialAudio(manifest, stage, stepIndex, step);
  const source = sampleUrl || asset;

  const stop = useCallback(() => {
    serial.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load?.();
      audioRef.current = null;
    }
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    fetch('/tutorial-audio/manifest.json', {cache: 'no-cache'})
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (!cancelled) setManifest(value); })
      .catch(() => { if (!cancelled) setManifest(null); });
    return () => { cancelled = true; };
  }, []);

  // Clear audio immediately when a tip changes or its dialog closes.
  useEffect(() => {
    stop();
    setSampleUrl('');
    return () => stop();
  }, [key, stop]);
  useEffect(() => () => { if (sampleUrl) URL.revokeObjectURL(sampleUrl); }, [sampleUrl]);

  const persist = useCallback(change => {
    const next = writeVoicePreferences(browserStorage(), {...prefsRef.current, ...change});
    prefsRef.current = next;
    setPreferences(next);
    return next;
  }, []);

  const play = useCallback((url, rate) => {
    if (!audioSupported() || !url) { setError('Neural narration is not bundled for this tip yet.'); return; }
    stop();
    setError('');
    const id = ++serial.current;
    const audio = new window.Audio(url);
    audio.preload = 'auto';
    audio.playbackRate = rate;
    audio.onplaying = () => { if (id === serial.current) setStatus('playing'); };
    audio.onpause = () => { if (id === serial.current && !audio.ended) setStatus('paused'); };
    audio.onended = () => { if (id === serial.current) setStatus('finished'); };
    audio.onerror = () => { if (id === serial.current) { setStatus('idle'); setError('Audio could not load. Try another MP3 or regenerate the voice clips.'); } };
    audioRef.current = audio;
    setStatus('starting');
    const attempt = audio.play();
    if (attempt?.catch) attempt.catch(() => { if (id === serial.current) { setStatus('idle'); setError('Press Replay to start narration.'); } });
  }, [stop]);

  // Automatic continuity after the user has opted in. Browsers may require a gesture.
  useEffect(() => {
    const token = `${key}|${source}`;
    if (skipAutoRef.current === token) { skipAutoRef.current = null; return; }
    if (prefsRef.current.enabled && source && audioSupported()) play(source, prefsRef.current.rate);
  }, [key, source, play]);

  const enable = () => {
    if (preferences.enabled) { persist({enabled:false}); stop(); return; }
    const next = persist({enabled:true});
    if (source) { skipAutoRef.current = `${key}|${source}`; play(source, next.rate); }
    else setError('No studio voice clip yet. Import an ElevenLabs recording in Voice settings or generate the remaining tutorial MP3s.');
  };
  const replay = () => {
    if (!source) { setError('No studio voice clip yet. Import an ElevenLabs recording in Voice settings.'); return; }
    if (!preferences.enabled) persist({enabled:true});
    play(source, prefsRef.current.rate);
  };
  const togglePause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      const attempt = audio.play();
      if (attempt?.catch) attempt.catch(() => setError('Press Replay to resume.'));
    } else audio.pause();
  };
  const chooseSpeed = value => {
    const next = persist({rate:Number(value)});
    if (audioRef.current) audioRef.current.playbackRate = next.rate;
  };
  const importSample = file => {
    if (!file) return;
    if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|wav|ogg)$/i.test(file.name)) {
      setError('Please choose an audio recording.'); return;
    }
    if (file.size > 20_000_000) { setError('Please use an audio file smaller than 20 MB.'); return; }
    const url = URL.createObjectURL(file);
    stop();
    setSampleUrl(url);
    setError('');
    if (prefsRef.current.enabled) { skipAutoRef.current = `${key}|${url}`; play(url, prefsRef.current.rate); }
  };
  return { available: audioSupported(), hasClip: Boolean(source), sourceIsSample: Boolean(sampleUrl),
    preferences, status, error, enable, replay, togglePause, chooseSpeed, importSample };
}

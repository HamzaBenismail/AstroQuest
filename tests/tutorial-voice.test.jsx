import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { TutorialGuide } from '../src/ui/v4/TutorialGuide.jsx';
import { TUTORIAL_STEPS } from '../src/ui/v4/tutorialGuide.js';
import { TUTORIAL_VOICE_STORAGE_KEY, VOICE_SPEEDS, narrationForTutorialStep, readVoicePreferences,
  writeVoicePreferences, tutorialAudioFileName, validatedTutorialAudio } from '../src/ui/v4/tutorialVoice.js';
const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('AstroQuest studio narration', () => {
  it('matches all 24 exact tutorial texts with unique audio filenames', () => {
    const ids = new Set(); let count = 0;
    for (const [stage,steps] of Object.entries(TUTORIAL_STEPS)) for (const [index,step] of steps.entries()) {
      count++;
      expect(narrationForTutorialStep(step)).toContain(step.title);
      expect(narrationForTutorialStep(step)).toContain(step.text);
      const file = tutorialAudioFileName(stage,index);
      expect(file).toMatch(/^[a-z]+-[0-9]{2}\.mp3$/);
      expect(ids.has(file)).toBe(false); ids.add(file);
      const manifest = {version:1,clips:[{stage,index,file,text:narrationForTutorialStep(step)}]};
      expect(validatedTutorialAudio(manifest,stage,index,step)).toBe('/tutorial-audio/'+file);
      expect(validatedTutorialAudio(manifest,stage,index,{...step,text:step.text+' changed'})).toBeNull();
    }
    expect(count).toBe(24);
  });
  it('rejects malformed or absent recording manifests', () => {
    expect(tutorialAudioFileName('../../unsafe',0)).toBeNull();
    expect(tutorialAudioFileName('menu',-1)).toBeNull();
    expect(validatedTutorialAudio({version:2,clips:[]},'menu',0,TUTORIAL_STEPS.menu[0])).toBeNull();
    expect(validatedTutorialAudio(null,'menu',0,TUTORIAL_STEPS.menu[0])).toBeNull();
  });
  it('saves narration preferences separately from progress and old robotic preferences', () => {
    const map = new Map();const store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
    expect(readVoicePreferences(store)).toEqual({enabled:false,rate:1});
    expect(writeVoicePreferences(store,{enabled:true,rate:0.9})).toEqual({enabled:true,rate:0.9});
    expect(readVoicePreferences(store).enabled).toBe(true);
    expect(VOICE_SPEEDS).toEqual([0.9,1,1.1]);
    expect(TUTORIAL_VOICE_STORAGE_KEY).toBe('astroquest.tutorial.neural.v1');
    map.set(TUTORIAL_VOICE_STORAGE_KEY,'broken');expect(readVoicePreferences(store).enabled).toBe(false);
  });
  it('shows a safe text fallback and supports import of studio voice recordings', () => {
    const html = renderToStaticMarkup(<TutorialGuide stage="menu" stepIndex={0} onStep={()=>{}} onClose={()=>{}} onSkipAll={()=>{}}/>);
    expect(html).toContain('Welcome to AstroQuest');
    expect(html).toContain('Audio playback is not available in this browser');
    const panel=source('../src/ui/v4/TutorialGuide.jsx');
    expect(panel).toContain('Preview another recording');
    expect(panel).toContain('Listen to narration');
  });
  it('never falls back to robotic speech synthesis or calls a cloud API in browsers', () => {
    const hook=source('../src/ui/v4/useTutorialNarrator.js');
    expect(hook).toContain('new window.Audio(url)');
    expect(hook).toContain('audio.pause()');
    expect(hook).not.toMatch(/window\.speechSynthesis|new SpeechSynthesisUtterance|heygen\.com/);
    const generator=source('../scripts/generate-tutorial-elevenlabs.mjs');
    expect(generator).toContain('api.elevenlabs.io/v1');
    expect(generator).toContain('ELEVENLABS_API_KEY');
    expect(generator).toContain('user/subscription');
  });
});

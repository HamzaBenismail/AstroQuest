import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {TUTORIAL_STEPS} from '../src/ui/v4/tutorialGuide.js';
import {narrationForTutorialStep, validatedTutorialAudio} from '../src/ui/v4/tutorialVoice.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'public/tutorial-audio/manifest.json'),'utf8'));
const sample=path.join(root,'public/tutorial-audio/menu-01.mp3');
const generator=path.join(root,'scripts/generate-tutorial-elevenlabs.mjs');

describe('ElevenLabs Jessica recording and free-tier batch exporter',()=>{
  it('keeps the approved MP3 alongside a matching script manifest',()=>{
    expect(manifest.version).toBe(1);
    expect(manifest.voiceId).toBe('cgSgspJ2msm6clMCkdW9');
    expect(manifest.modelId).toBe('eleven_v4');
    expect(manifest.clips).toHaveLength(1);
    expect(manifest.clips[0].text).toBe(narrationForTutorialStep(TUTORIAL_STEPS.menu[0]));
    expect(validatedTutorialAudio(manifest,'menu',0,TUTORIAL_STEPS.menu[0])).toBe('/tutorial-audio/menu-01.mp3');
    expect(validatedTutorialAudio(manifest,'menu',1,TUTORIAL_STEPS.menu[1])).toBeNull();
    const bytes=readFileSync(sample);
    expect(bytes.length).toBeGreaterThan(100_000);
    expect(bytes.subarray(0,3).toString('ascii')==='ID3'|| (bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)).toBe(true);
  });
  it('calculates 23 pending clips without making an API request',()=>{
    const output=execFileSync(process.execPath,[generator,'--dry-run'],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH}});
    expect(output).toContain('1 complete, 23 missing');
    expect(output).toContain('4065 characters needed');
    expect(output).toContain('Dry run only: no API requests or credits used.');
  });
  it('does not generate anything without a private API key',()=>{
    const run=spawnSync(process.execPath,[generator,'--all'],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH}});
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain('ELEVENLABS_API_KEY');
    expect(manifest.clips).toHaveLength(1);
  });
});

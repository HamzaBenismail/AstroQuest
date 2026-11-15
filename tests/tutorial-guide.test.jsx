import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TUTORIAL_STORAGE_KEY, TUTORIAL_STAGES, TUTORIAL_STEPS, guideStageForState,
  normalizeGuidePreferences, readGuidePreferences, writeGuidePreferences,
  markGuideStageSeen, skipAutomaticGuide, SYSTEM_ROOM_ORDER, systemGuideIndexForRoom,
} from '../src/ui/v4/tutorialGuide.js';
import { TutorialGuide, TutorialHelpButton } from '../src/ui/v4/TutorialGuide.jsx';
import { readFileSync } from 'node:fs';

const text = path => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('AstroQuest staged tutorial', () => {
  it('has understandable steps and a real highlight anchor in every chapter', () => {
    const screens = text('../src/ui/v4/CrewMissionExperience.jsx') + text('../src/ui/v4/DiscoveryUI.jsx');
    for (const stage of TUTORIAL_STAGES) {
      const steps = TUTORIAL_STEPS[stage];
      expect(steps.length, stage).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.title.length).toBeGreaterThan(4);
        expect(step.text.length).toBeGreaterThan(50);
        expect(screens).toContain(`data-guide-anchor="${step.anchor}"`);
      }
    }
    expect(TUTORIAL_STEPS.play).toHaveLength(5);
    expect(TUTORIAL_STEPS.menu).toHaveLength(2);
  });

  it('matches the current mission stage but stays hidden during cinematics', () => {
    const state = { stage: 'menu', collectionScope: null };
    expect(guideStageForState(state, null)).toBe('menu');
    expect(guideStageForState({...state, stage:'preparation'}, null)).toBe('preparation');
    expect(guideStageForState({...state, stage:'crew-assembly'}, null)).toBe('assembly');
    for (const [screen, expected] of [['planning','play'],['report','report'],['debrief','debrief']]) {
      const active = {...state, stage:'play', session:{screen}};
      expect(guideStageForState(active, null)).toBe(expected);
      expect(guideStageForState(active, {kind:'day'})).toBeNull();
    }
    expect(guideStageForState({...state, collectionScope:'lifetime'}, null)).toBe('collection');
    expect(guideStageForState({...state,stage:'play',session:{screen:'report'},discoveryProgress:{popupId:'bio-lettuce'}}, null)).toBeNull();
    expect(guideStageForState({...state, stage:'unknown'}, null)).toBeNull();
  });

  it('saves the seen chapters without duplicates and tolerates damaged storage', () => {
    const data = new Map();
    const storage = {
      getItem: key => data.has(key) ? data.get(key) : null,
      setItem: (key, value) => data.set(key, value),
    };
    expect(readGuidePreferences(storage)).toEqual({seenStages:[],disabledAuto:false});
    let prefs = markGuideStageSeen(readGuidePreferences(storage), 'menu');
    prefs = markGuideStageSeen(prefs, 'menu');
    prefs = markGuideStageSeen(prefs, 'play');
    expect(writeGuidePreferences(storage, prefs).seenStages).toEqual(['menu', 'play']);
    expect(JSON.parse(data.get(TUTORIAL_STORAGE_KEY)).seenStages).toEqual(['menu','play']);
    expect(readGuidePreferences(storage).disabledAuto).toBe(false);
    expect(writeGuidePreferences(storage, skipAutomaticGuide(prefs)).disabledAuto).toBe(true);
    data.set(TUTORIAL_STORAGE_KEY, '{unparseable');
    expect(readGuidePreferences(storage)).toEqual({seenStages:[],disabledAuto:false});
    expect(normalizeGuidePreferences({seenStages:['menu','invalid','play','play'],disabledAuto:1}))
      .toEqual({seenStages:['menu','play'],disabledAuto:false});
  });

  it('works when browser storage is unavailable', () => {
    const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
    expect(readGuidePreferences(blocked).seenStages).toEqual([]);
    expect(writeGuidePreferences(blocked, {seenStages:['menu'], disabledAuto:false}).seenStages).toEqual(['menu']);
    expect(readGuidePreferences(null).disabledAuto).toBe(false);
  });

  it('renders accessible tutorial controls, progress, and always-available help', () => {
    const html = renderToStaticMarkup(<TutorialGuide stage="play" stepIndex={0}
      styleName="playful" onStep={()=>{}} onClose={()=>{}} onSkipAll={()=>{}}/>);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="false"');
    expect(html).toContain('Keep an eye on your meters');
    expect(html).toContain('1 OF 5');
    expect(html).toContain('Skip automatic tips');
    expect(html).toContain('data-menu-style="playful"');
    const end = renderToStaticMarkup(<TutorialGuide stage="debrief" stepIndex={0}
      onStep={()=>{}} onClose={()=>{}} onSkipAll={()=>{}}/>);
    expect(end).toContain('Got it!');
    expect(renderToStaticMarkup(<TutorialHelpButton onClick={()=>{}}/>)).toContain('How to play');
  });

  it('never invokes the mission reducer or changes the simulator', () => {
    const guide = text('../src/ui/v4/tutorialGuide.js');
    const panel = text('../src/ui/v4/TutorialGuide.jsx');
    expect(guide).not.toMatch(/reduceCrewExperience|reduceC3Session|COMMIT_DAY|SET_POWER/);
    expect(panel).not.toMatch(/reduceCrewExperience|reduceC3Session|COMMIT_DAY|SET_POWER/);
  });
});

describe('Room-by-room, Energy and Research tutorial', () => {
  it('has a manually accessible lesson for every room and all three resources', () => {
    const screens = text('../src/ui/v4/CrewMissionExperience.jsx');
    const steps = TUTORIAL_STEPS.systems;
    expect(steps).toHaveLength(9);
    expect(SYSTEM_ROOM_ORDER).toEqual(['lifeSupport', 'greenhouse', 'science', 'power', 'shield', 'comms']);
    for (const [index, room] of SYSTEM_ROOM_ORDER.entries()) {
      expect(systemGuideIndexForRoom(room)).toBe(index);
      expect(steps[index].anchor).toBe(`room-${room}`);
      expect(screens).toContain('data-guide-anchor={`room-${room}`}');
    }
    expect(steps.slice(6).map(step => step.anchor)).toEqual(['energy', 'battery', 'research']);
    for (const step of steps) {
      expect(step.title.length).toBeGreaterThan(9);
      expect(step.text.length).toBeGreaterThan(90);
    }
    for (const resource of ['energy','battery','research']) {
      expect(screens).toContain(`data-guide-anchor="${resource}"`);
    }
    expect(systemGuideIndexForRoom('unexpected')).toBe(0);
  });

  it('keeps advanced topics optional, replayable and isolated from the simulator', () => {
    expect(TUTORIAL_STAGES).not.toContain('systems');
    expect(TUTORIAL_STEPS.play).toHaveLength(5);
    const saved = markGuideStageSeen({ seenStages:['play'], disabledAuto:false }, 'play');
    expect(saved.seenStages).toEqual(['play']);
    const interactive = text('../src/ui/v4/CrewMissionExperience.jsx');
    expect(interactive).toContain('onShowRoomGuide={openSystemGuide}');
    expect(interactive).toContain('Learn what ${def.name} does');
    expect(interactive).toContain("setGuide({stage:'systems', index:systemGuideIndexForRoom(room)})");
    const html = renderToStaticMarkup(<TutorialGuide stage="systems" stepIndex={7}
      onStep={()=>{}} onClose={()=>{}} onSkipAll={()=>{}} onRelatedGuide={()=>{}} />);
    expect(html).toContain('Battery · Save Energy for later');
    expect(html).toContain('← Back to mission basics');
    const basic = renderToStaticMarkup(<TutorialGuide stage="play" stepIndex={0}
      onStep={()=>{}} onClose={()=>{}} onSkipAll={()=>{}} onRelatedGuide={()=>{}} />);
    expect(basic).toContain('Explore rooms, Energy &amp; Research');
    expect(text('../src/ui/v4/tutorialGuide.js')).not.toMatch(/reduceCrewExperience|reduceC3Session|COMMIT_DAY|SET_POWER/);
  });
});

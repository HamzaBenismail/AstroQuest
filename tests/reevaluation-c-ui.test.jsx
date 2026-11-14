import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildC3Candidate } from '../scripts/reevaluation-c-candidate.mjs';
import original from '../src/data/config.json';
import MissionExperienceC from '../src/ui/v3/MissionExperience.jsx';

const config=buildC3Candidate({...original,stormMapping:{...original.stormMapping,status:'approved'}});
const mission={missionId:'RENDER-TEST',site:'moon',dataSource:'TEST ONLY',days:Array.from({length:config.missionLengthDays},(_,i)=>({day:i+1,date:`synthetic-${i}`,stormLevel:2,events:[]}))};

describe('Reevaluation C — accessible UI smoke',()=>{
  it('renders a child-friendly mission briefing before play',()=>{
    const html=renderToStaticMarkup(<MissionExperienceC config={config} mission={mission}/>);
    expect(html).toContain('Start mission');
    expect(html).toContain('Research Points');
    expect(html).toContain('simplified game units');
  });
});

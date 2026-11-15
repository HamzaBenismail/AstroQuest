import {describe,it,expect} from 'vitest';
import {roomTapAction} from '../src/ui/v4/crewTap.js';
import {ROOM_ACCENTS,CREW_COLOR_NAMES} from '../src/ui/v4/crewColors.js';
import {createCrewCandidates,MAX_CREW_PER_MISSION} from '../src/logic/v4/crewRules.js';

describe('Crew selection and room click-through (D6)',()=>{
  it('uses six distinct room/suit color matches',()=>{
    const crew=createCrewCandidates();
    expect(MAX_CREW_PER_MISSION).toBe(6);
    expect(new Set(crew.map(c=>ROOM_ACCENTS[c.specialty])).size).toBe(6);
    expect(new Set(Object.values(CREW_COLOR_NAMES)).size).toBe(6);
  });
  it('treats tapping a worker as selecting its room',()=>{
    expect(roomTapAction('shield',null,'crew-5')).toEqual({type:'FOCUS_ROOM',room:'shield'});
    expect(roomTapAction('shield','crew-2','crew-5')).toEqual({type:'FOCUS_ROOM',room:'shield'});
  });
  it('places a selected astronaut in an empty room',()=>{
    expect(roomTapAction('greenhouse','crew-2',null)).toEqual({type:'PLACE_CREW',room:'greenhouse'});
  });
  it('does not accidentally swap a different occupied worker',()=>{
    expect(roomTapAction('greenhouse','crew-1','crew-2')).toEqual({type:'FOCUS_ROOM',room:'greenhouse'});
  });
});

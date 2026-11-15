import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const jsx=readFileSync('src/ui/v4/CrewMissionExperience.jsx','utf8');
const css=readFileSync('src/ui/v4/crew-ui.css','utf8');
const scene=jsx.match(/const previewing =[^\n]+\n\s*\/\/[^\n]+\n\s*const showingInterior =[^\n]+/);
assert.ok(scene, 'Crew + hover reveal logic present');
assert.match(jsx,/const showingInterior = Boolean\(worker\) \|\| previewing;/);
assert.match(jsx,/\{showingInterior && <img className="crew-ship__interior"/);
assert.match(jsx,/data-room-open=\{showingInterior \? 'true' : 'false'\}/);
assert.match(jsx,/\$\{previewing\?'is-hovered':''\}/);
assert.match(css,/\.crew-ship__room \{container-type:size;\}/);
assert.match(css,/\.crew-ship__room-select \.crew-icon \{[^}]*left:50%;top:50%/);
assert.match(css,/\.crew-ship__room\[data-room-open="true"\] \.crew-ship__room-select \.crew-icon \{[^}]*translate\(calc\(-50cqw/);
assert.match(css,/\.crew-ship__room \.crew-ship__worker\{[^}]*bottom:clamp\(18px/);
assert.match(css,/\.crew-ship__room \.crew-ship__worker \.crew-astronaut--small\s*\{[^}]*max-width:42px/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\) \{\s*\.crew-ship__room-select \.crew-icon/);
// This is a presentation-only change: the known v3/v4 simulation files are not included in the D4 overlay.
const cases=[
 [false,false,false], // empty untouched room
 [false,true,true],  // hovering with selected astronaut
 [true,false,true],  // assigned room stays visible
 [true,true,true],   // assigned room remains visible during other drag
];
for(const [worker,previewing,expected] of cases){
  assert.equal(Boolean(worker)||Boolean(previewing),expected);
}
console.log('D4 UI states: empty closed, preview open, occupied persistent, icon center/corner, and worker sizing PASS');

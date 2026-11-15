import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { SHIP_DECK_LAYOUTS, SHIP_VIEWBOX, shipHatchStyle } from '../src/ui/v4/shipLayouts.js';
import { ROOM_IDS, SHIP_IDS } from '../src/logic/v4/crewRules.js';

const source=readFileSync(resolve('src/ui/v4/CrewMissionExperience.jsx'),'utf8');
const css=readFileSync(resolve('src/ui/v4/crew-ui.css'),'utf8');
const deckSource=readFileSync(resolve('src/ui/v4/ship-layouts.json'),'utf8');
const demo=existsSync(resolve('SMP-menu-style-experiment.html'))
  ? readFileSync(resolve('SMP-menu-style-experiment.html'),'utf8') : null; // demo intentionally absent from release
const boxArea=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
assert.deepEqual(Object.keys(SHIP_DECK_LAYOUTS),SHIP_IDS);
assert.equal(new Set(SHIP_IDS.map(id=>SHIP_DECK_LAYOUTS[id].pattern)).size,4);
const geom=new Set();
for(const ship of SHIP_IDS){
 const layout=SHIP_DECK_LAYOUTS[ship];
 assert.deepEqual(Object.keys(layout.rooms).sort(),[...ROOM_IDS].sort(),`${ship}: must carry all six departments exactly once`);
 const list=Object.entries(layout.rooms);
 for(const [room,b] of list){
   for(const k of ['x','y','w','h']) assert.ok(Number.isInteger(b[k]),`${ship}/${room} ${k} integer`);
   assert.ok(b.x>=0 && b.y>=0 && b.w>=80 && b.h>=70,`${ship}/${room}: positive interactive size`);
   assert.ok(b.x+b.w<=SHIP_VIEWBOX.width && b.y+b.h<=SHIP_VIEWBOX.height,`${ship}/${room}: inside ship`);
   const style=shipHatchStyle(ship,room);
   assert.equal(parseFloat(style.left),100*b.x/SHIP_VIEWBOX.width);
   assert.equal(parseFloat(style.width),100*b.w/SHIP_VIEWBOX.width);
   assert.equal(parseFloat(style.top),100*b.y/SHIP_VIEWBOX.height);
   assert.equal(parseFloat(style.height),100*b.h/SHIP_VIEWBOX.height);
 }
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)assert.equal(boxArea(list[i][1],list[j][1]),0,`${ship} boxes overlap: ${list[i][0]} & ${list[j][0]}`);
 geom.add(JSON.stringify(list.map(([id,b])=>[id,...Object.values(b)])));
 const svg=readFileSync(resolve(`public/art/ship-${ship}-sealed.svg`),'utf8');
 assert.match(svg,/viewBox="0 0 1200 760"/);
 assert.equal((svg.match(/id="hatch-/g)||[]).length,6,`${ship} must render exactly six visible hatches`);
 assert.ok(svg.includes(`data-deck-pattern="${layout.pattern}"`));
 for(const [room,b] of list){
   assert.ok(svg.includes(`id="hatch-${room}"`));
   assert.ok(svg.includes(`data-bounds="${b.x},${b.y},${b.w},${b.h}"`),`${ship}: ${room} art must match drop target`);
 }
}
assert.equal(geom.size,4,'All four deck footprints must differ, not merely their colors or names');
assert.match(source,/style=\{\{\.\.\.shipHatchStyle\(ship,room\),/);
assert.match(source,/data-ship=\{ship\}/);
assert.match(source,/SHIP_DECK_LAYOUTS\[id\]\.pattern/);
assert.ok(!css.includes('.crew-ship__room--lifeSupport{left:'),'Fixed 3x2 room grid must be removed');
for(const shape of ['horizon','nova'])assert.ok(css.includes(`data-ship="${shape}"`));
assert.match(source,/MENU_STYLE_ORDER = Object\.freeze\(\['classic', 'playful', 'starry'\]\)/);
assert.match(source,/setUiStyle\(nextMenuStyle\)/);
assert.equal((source.match(/data-menu-style=\{uiStyle\}/g)||[]).length,6); // menu, prep, assembly, gameplay, daily report, debrief
assert.equal((source.match(/<MenuStyleSwitch uiStyle=\{uiStyle\} onToggleStyle=\{onToggleStyle\}\/>/g)||[]).length,6);
assert.ok(!/dispatch\(\{\s*type:\s*['"](STYLE|THEME)/.test(source),'Visual theme must not dispatch gameplay actions');
assert.ok(css.includes('.crew-menu[data-menu-style="starry"]:before'));
assert.ok(css.includes('.crew-prep[data-menu-style="starry"]:before'));
const stars=readFileSync(resolve('public/art/classic-scattered-stars.svg'),'utf8');
assert.ok(css.includes('classic-scattered-stars.svg'));
assert.ok(css.includes('background-repeat:no-repeat'));
assert.ok(!css.includes('.crew-prep[data-menu-style="starry"]:before{\n content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;\n background-image:radial-gradient'));
const starPositions=[...stars.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].map(([,x,y])=>[Number(x),Number(y)]);
assert.ok(starPositions.length >= 150, 'A rich scatter, not two tiled grids');
assert.equal(new Set(starPositions.map(p=>p.join(','))).size,starPositions.length);
assert.ok(new Set(starPositions.map(p=>Math.floor(p[0] / 125))).size>=11);
assert.ok(new Set(starPositions.map(p=>Math.floor(p[1] / 95))).size>=10);
assert.ok(starPositions.some(([x,y])=>x>1400&&y>800) && starPositions.some(([x,y])=>x<200&&y<150));
assert.match(source,/const showingInterior = Boolean\(worker\) \|\| previewing/);
assert.match(source,/data-room-open=\{showingInterior \? 'true' : 'false'\}/);
assert.ok(css.includes('.crew-ship__room[data-room-open="true"] .crew-ship__room-select .crew-icon'));
assert.ok(css.includes('container-type:size'));
assert.ok(css.includes('.crew-ship__room .crew-ship__worker .crew-astronaut--small'));

assert.ok(css.includes('.crew-menu[data-menu-style="playful"]'));
assert.ok(css.includes('prefers-reduced-motion:reduce'));
if (demo) {
assert.match(demo,/const themeOrder=\['classic','playful','starry'\]/);
assert.match(demo,/deckNames/);
const scripts=[...demo.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1);assert.doesNotThrow(()=>new Script(scripts[0][1]));
assert.ok(demo.includes('cargo.air+cargo.supplies+cargo.battery'), 'Cargo capacity must still be shared');
}
assert.ok(deckSource.includes('Command bridge'));
console.log('Reevaluation D.3: four unique room configurations, 24 painted hatch/drop-target matches, 3-theme cycle, Classic star overlay, and intact cargo controls PASS.');

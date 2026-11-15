/** Dependency-free F5 structural checks; not a substitute for Vitest/browser playthroughs. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const scene = readFileSync(resolve('src/scene/LunarScene.jsx'), 'utf8');
const css = readFileSync(resolve('src/scene/scene.css'), 'utf8');
const app = readFileSync(resolve('src/App.jsx'), 'utf8');
const credits = readFileSync(resolve('public/art/CREDITS.md'), 'utf8');
const assets = readdirSync(resolve('public/art')).filter(name => name.endsWith('.svg')).sort();
const expected = ['sky.svg', 'earth.svg', 'crater-rim.svg', 'terrain.svg', 'outpost.svg', 'shield.svg', 'foreground.svg', 'lights.svg', 'greenhouse-plants.svg', 'air-warning.svg'].sort();
for (const asset of expected) assert.ok(assets.includes(asset), `Missing original Phase 5 asset: ${asset}`);
for (const asset of expected) {
  const svg = readFileSync(resolve('public/art', asset), 'utf8');
  assert.match(svg, /viewBox="0 0 1920 1080"/);
  assert.ok(credits.includes(`\`${asset}\``), `Credits missing for ${asset}`);
}
for (const forbidden of ['Math.random', 'Date.now', 'fetch(', 'axios', 'pixi', 'three', 'phaser', 'stormDamage']) {
  assert.ok(!scene.includes(forbidden), `Scene must not use ${forbidden}`);
}
assert.match(scene, /data-storm=/);
assert.match(scene, /data-night=/);
assert.match(scene, /data-shield=/);
assert.match(scene, /data-greenhouse=/);
assert.match(scene, /data-low-air=/);
assert.match(scene, /recordedEvent\.label/);
assert.match(scene, /recordedEvent\.sourceId/);
assert.match(scene, /style\.setProperty/);
assert.match(scene, /onPointerMove=/);
assert.match(scene, /onSelectRoom/);
assert.match(app, /getElementById/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(css, /pointer: coarse/);
assert.match(css, /scene-air-pulse/);
assert.match(app, /<LunarScene config=\{gameConfig\} session=\{session\}/);
console.log(`F5 structural checks passed: seven layers, ${assets.length} credited assets, scene state wiring, motion fallback`);

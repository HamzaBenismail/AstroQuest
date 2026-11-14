import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../src/data/config.json';
import LunarScene from '../src/scene/LunarScene.jsx';

const defaultAllocation = {
  lifeSupport: 0,
  shield: 0,
  greenhouse: 0,
  science: 0,
};
function state(screen, overrides = {}) {
  return {
    screen,
    game: {
      day: 1,
      meters: { ...config.startingMeters },
      ...overrides.game,
    },
    allocation: { ...defaultAllocation, ...overrides.allocation },
    reveal: overrides.reveal ?? null,
  };
}
const render = session => renderToStaticMarkup(<LunarScene config={config} session={session}/>);

describe('F5 — read-only lunar scene', () => {
  it('renders the seven transparent layers, each backed by an asset', () => {
    const html = render(state('planning'));
    expect((html.match(/data-layer="\d"/g) || [])).toHaveLength(7);
    for (const name of ['sky.svg', 'earth.svg', 'crater-rim.svg', 'terrain.svg',
      'outpost.svg', 'shield.svg', 'foreground.svg', 'lights.svg',
      'greenhouse-plants.svg', 'air-warning.svg']) {
      expect(html).toContain(`/art/${name}`);
    }
    const allAssets = readdirSync(resolve('public/art')).filter(name => name.endsWith('.svg'));
    expect(allAssets.length).toBeGreaterThanOrEqual(10);
    for (const name of allAssets) {
      const svg = readFileSync(resolve('public/art', name), 'utf8');
      expect(svg).toContain('viewBox="0 0 1920 1080"');
    }
  });

  it('shows shielding and greenhouse growth when power is allocated', () => {
    const off = render(state('planning'));
    expect(off).toContain('data-shield="off"');
    expect(off).toContain('data-greenhouse="off"');
    const on = render(state('planning', { allocation: { shield: 2, greenhouse: 3 } }));
    expect(on).toContain('data-shield="on"');
    expect(on).toContain('data-greenhouse="on"');
    expect(on).toContain('Shield powered');
    expect(on).toContain('--plant-height:');
  });

  it('marks a configured night as a limited-power, darker scene', () => {
    const day = render(state('planning'));
    expect(day).toContain('data-night="false"');
    expect(day).toContain('data-power="normal"');
    const night = render(state('planning', { game: { day: 5 } }));
    expect(night).toContain('data-night="true"');
    expect(night).toContain('data-power="limited"');
    expect(night).toContain('Simulated lunar night');
  });

  it('warns when air is low using the configured success threshold', () => {
    const high = render(state('planning'));
    expect(high).toContain('data-low-air="false"');
    const low = render(state('planning', { game: { meters: { air: config.successMinMeter, food: 5, safety: 5 } } }));
    expect(low).toContain('data-low-air="true"');
    expect(low).toContain('Low air');
  });

  it('names only actual recorded NASA events after reveal, not during a forecast', () => {
    const event = { type: 'FLR', label: 'Synthetic flare for test ONLY', sourceId: 'synthetic-id' };
    const preview = render(state('planning'));
    expect(preview).not.toContain(event.label);
    expect(preview).toContain('data-storm="false"');
    const revealed = render(state('reveal', {
      reveal: { day: 7, actual: 3, events: [event] },
    }));
    expect(revealed).toContain('data-storm="true"');
    expect(revealed).toContain(event.label);
    expect(revealed).toContain(event.sourceId);
    expect(revealed).toContain('Archived NASA DONKI');
    const missing = render(state('reveal', {
      reveal: { day: 7, actual: 3, events: [] },
    }));
    expect(missing).toContain('No source event label is available');
  });

  it('offers keyboard-accessible room hotspots when planning', () => {
    const html = renderToStaticMarkup(<LunarScene config={config}
      session={state('planning')} onSelectRoom={() => {}}/>);
    for (const label of ['Life support', 'Shield', 'Greenhouse', 'Science']) {
      expect(html).toContain(`Go to ${label} power controls`);
    }
    const revealed = render(state('reveal', { reveal: { day: 1, actual: 0, events: [] } }));
    expect(revealed).not.toContain('Go to Life support power controls');
  });

  it('keeps a reduced-motion and touch-safe CSS fallback', () => {
    const css = readFileSync(resolve('src/scene/scene.css'), 'utf8');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('pointer: coarse');
    expect(css).toMatch(/scene-layer \{ transform: none !important/);
  });
});

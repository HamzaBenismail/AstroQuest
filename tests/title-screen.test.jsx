import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import TitleScreen from '../src/ui/v4/TitleScreen.jsx';

const file = path => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('AstroQuest cinematic title screen', () => {
  it('renders a single accessible Start action, the game title, and real ship artwork', () => {
    const html = renderToStaticMarkup(<TitleScreen onStart={() => {}}/>);
    expect(html).toContain('<h1 id="aq-title-screen__name"');
    expect(html).toContain('Astro<span>Quest</span>');
    expect(html).toContain('JUNIOR ASTRONAUT MISSION TRAINER');
    expect(html).toContain('/art/ship-explorer-sealed.svg');
    expect(existsSync(new URL('../public/art/ship-explorer-sealed.svg', import.meta.url))).toBe(true);
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain('Start <span aria-hidden="true">');
    expect(html).not.toContain('Data Sources');
  });

  it('creates a full-screen space scene with illustrated stars and planets', () => {
    const html = renderToStaticMarkup(<TitleScreen onStart={() => {}}/>);
    expect(html).toContain('aq-title-screen__stars--far');
    expect(html).toContain('aq-title-screen__stars--near');
    expect(html).toContain('aq-title-screen__planet--earth');
    expect(html).toContain('aq-title-screen__planet--mars');
    expect(html).toContain('aq-title-screen__planet--ringed');
  });

  it('does not show gameplay or the Data Sources action until Start is pressed', () => {
    const app = file('../src/App.jsx');
    expect(app).toContain('const [showTitleScreen, setShowTitleScreen] = useState(true);');
    expect(app).toContain('if (showTitleScreen && !ready.issue) {');
    expect(app).toContain('<TitleScreen onStart={() => setShowTitleScreen(false)} />');
    expect(app.indexOf('if (showTitleScreen && !ready.issue)')).toBeLessThan(app.indexOf('const game = ready.issue'));
  });

  it('respects reduced motion and keeps animation decorative only', () => {
    const css = file('../src/ui/v4/title-screen.css');
    const jsx = file('../src/ui/v4/TitleScreen.jsx');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('animation:none!important');
    expect(css).toContain('aq-ship-arrive');
    expect(css).toContain('aq-logo-reveal');
    expect(jsx).not.toMatch(/COMMIT_DAY|reduceCrewExperience|saveDiscoveryIds|readGuidePreferences/);
  });
});

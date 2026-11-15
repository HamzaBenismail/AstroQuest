import React from 'react';
import { expect, describe, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import catalog from '../src/data/discoveries.js';
import { DiscoveryPopup, DiscoveryCollection } from '../src/ui/v4/DiscoveryUI.jsx';

describe('Reevaluation D.8 — real-photo discoveries without visible workflow metadata',()=>{
  it('renders the bonus popup with a credited image and no external source link',()=>{
    const html=renderToStaticMarkup(<DiscoveryPopup id="bio-lettuce" points={2} onClose={()=>{}}/>);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Continue mission');
    expect(html).toContain('+2 Research');
    expect(html).toContain('lettuce.jpg');
    expect(html).toContain('NASA / ISS Expedition 40');
    expect(html).toContain(catalog[0].publicSummary);
    expect(html).not.toContain(catalog[0].summary);
    expect(html).not.toContain('href=');
    expect(html).not.toMatch(/pending review|draft|not yet verified|preview/i);
  });
  it('shows empty collection and theme selector without introducing study links',()=>{
    const html=renderToStaticMarkup(<DiscoveryCollection ids={[]} title="Your discoveries" subtitle="All missions" styleName="starry" onBack={()=>{}}/>);
    expect(html).toContain('No discoveries yet');
    expect(html).toContain('data-menu-style="starry"');
    expect(html).toContain('0 out of 32 studies found');
    expect(html).not.toContain('href=');
  });
  it('renders a safely confirmed collection reset only when the handler is supplied',()=>{
    const html=renderToStaticMarkup(<DiscoveryCollection ids={['bio-lettuce']} title="Your discoveries" subtitle="All missions" onReset={()=>{}} onBack={()=>{}}/>);
    expect(html).toContain('Reset discoveries');
    const run=renderToStaticMarkup(<DiscoveryCollection ids={['bio-lettuce']} title="This run" subtitle="Only this run" onBack={()=>{}}/>);
    expect(run).not.toContain('Reset discoveries');
  });
  it('renders two independent real photos with credits and safe summaries',()=>{
    const html=renderToStaticMarkup(<DiscoveryCollection ids={['bio-lettuce','bio-mizuna']} title="Discovered this mission" subtitle="A run" styleName="classic" onBack={()=>{}}/>);
    expect(html).toContain('lettuce.jpg');
    expect(html).toContain('mizuna.jpg');
    expect(html).toContain('Photo: NASA / ISS Expedition 40');
    expect(html).toContain('Photo: NASA / ISS Expedition 61');
    expect(html).not.toContain(catalog[0].summary);
    expect(html).not.toMatch(/pending review|draft|not yet verified|preview|NASA OSDR study ↗/i);
  });
});

import { describe, expect, it } from 'vitest';
import cards from '../src/data/cards.json';
import facts from '../src/data/facts.json';
import sources from '../src/data/sources.json';
import { verifiedCards, verifiedFacts, chooseScienceCard, scienceCardForHistory } from '../src/ui/science-content.js';

describe('F6/F8/F9 science content safeguards', () => {
  it('provides five or six real OSDR reference candidates', () => {
    expect(cards.length).toBeGreaterThanOrEqual(5);
    expect(cards.length).toBeLessThanOrEqual(6);
    for (const card of cards) {
      expect(card.source.studyId).toMatch(/^OSD-\d+$/);
      expect(card.source.url).toBe(`https://osdr.nasa.gov/bio/repo/data/studies/${card.source.studyId}`);
      expect(card.text).not.toContain('TODO(VERIFY)');
    }
  });
  it('never displays unverified cards or facts', () => {
    expect(verifiedCards(cards).every(card => card.verified === true)).toBe(true);
    expect(verifiedFacts(facts).every(fact => fact.verified === true)).toBe(true);
    expect(chooseScienceCard([{...cards[0],verified:false}], {stage:'briefing'})).toBeNull();
  });
  it('selects unique contextual cards without inventing events', () => {
    const candidates = cards.map(card => ({...card,verified:true}));
    const init = chooseScienceCard(candidates,{stage:'briefing'});
    expect(init.trigger).toBe('mission-start');
    const context = {stage:'report', level:3,greenhouse:0,meters:{safety:5},
      severeLevel:3,lowMeter:3,shownIds:[init.id]};
    expect(chooseScienceCard(candidates,context).trigger).toBe('storm-severe');
    const history = [{day:1,stormLevel:3,allocation:{greenhouse:0},meters:{safety:5}}];
    const conf={powerBudget:{sunlitDays:[1]},stormLevelRange:[0,3],successMinMeter:3};
    expect(scienceCardForHistory(candidates,history,conf).trigger).toBe('storm-severe');
  });
  it('labels embedded DONKI data archived and provides transparent sources', () => {
    expect(sources.find(s => s.id === 'donki').status).toBe('Archived NASA data');
    expect(sources.some(s => s.id === 'osdr')).toBe(true);
  });
});

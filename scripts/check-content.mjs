import fs from 'node:fs';
const cards = JSON.parse(fs.readFileSync('src/data/cards.json', 'utf8'));
const facts = JSON.parse(fs.readFileSync('src/data/facts.json', 'utf8'));
const sources = JSON.parse(fs.readFileSync('src/data/sources.json', 'utf8'));
const failures = [];
if (cards.length < 5 || cards.length > 6) failures.push('Expected 5–6 OSDR learning cards');
for (const card of cards) {
  if (card.verified !== true) failures.push(`Human verification pending: ${card.id}`);
  if (!/^OSD-\d+$/.test(card.source?.studyId ?? '')) failures.push(`Missing OSDR study ID: ${card.id}`);
  if (card.source?.url !== `https://osdr.nasa.gov/bio/repo/data/studies/${card.source?.studyId}`) failures.push(`Invalid OSDR study URL: ${card.id}`);
  if ((card.text.match(/[.!?](?:\s|$)/g) ?? []).length > 2) failures.push(`Too many sentences: ${card.id}`);
}
for (const fact of facts) if (fact.verified !== true) failures.push(`NASA fact review pending: ${fact.id}`);
if (!sources.find(s => s.id === 'donki' && s.status === 'Archived NASA data')) failures.push('Missing archived DONKI attribution');
if (failures.length) {
  console.error('Phase 6 exit gate pending:\n- ' + failures.join('\n- '));
  process.exitCode = 1;
} else console.log(`Phase 6 content gate passed: ${cards.length} verified OSDR cards, ${facts.length} verified NASA facts, ${sources.length} sources.`);

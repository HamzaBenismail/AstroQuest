/** Presentation-only colors, keyed by the same specialties used in the crew rules.
 * Every color also has a readable name and a unique room icon; color is never
 * the sole way to identify an astronaut or destination.
 */
export const ROOM_ACCENTS = Object.freeze({
  lifeSupport: '#ffab62', // orange
  greenhouse: '#61dba1',  // green
  power: '#f1cc63',       // gold
  science: '#5ed4ed',     // blue
  shield: '#c49aff',      // lavender
  comms: '#ff90bf',       // pink
});
export const CREW_COLOR_NAMES = Object.freeze({
  lifeSupport: 'Orange', greenhouse: 'Green', power: 'Yellow',
  science: 'Blue', shield: 'Purple', comms: 'Pink',
});
export const CREW_SUIT_COLORS = Object.freeze([
  ROOM_ACCENTS.lifeSupport, ROOM_ACCENTS.greenhouse, ROOM_ACCENTS.power,
  ROOM_ACCENTS.science, ROOM_ACCENTS.shield, ROOM_ACCENTS.comms,
]);

/** Contextual, player-facing guidance. Pure definitions; never mutates the game simulator. */
export const TUTORIAL_STORAGE_KEY = 'astroquest.tutorial.v1';
export const TUTORIAL_STAGES = Object.freeze(['menu', 'preparation', 'assembly', 'play', 'report', 'debrief', 'collection']);

/** On-demand room guide: not an additional automatic, first-run tutorial chapter. */
export const SYSTEM_ROOM_ORDER = Object.freeze(['lifeSupport', 'greenhouse', 'science', 'power', 'shield', 'comms']);
export function systemGuideIndexForRoom(room) {
  const index = SYSTEM_ROOM_ORDER.indexOf(room);
  return index >= 0 ? index : 0;
}


export const TUTORIAL_STEPS = Object.freeze({
  menu: [
    { title: 'Welcome to AstroQuest!', text: 'You are the mission commander! Pick a spacecraft, build your crew, and keep everyone safe for ten days. We will show you how as you play.', anchor: 'menu-title' },
    { title: 'Choose your spacecraft', text: 'Tap any of the four ships to select it. Each has the same abilities, but the rooms are arranged differently. When you are ready, choose Prepare mission.', anchor: 'ship-choices' },
  ],
  preparation: [
    { title: 'Where will you land?', text: 'Choose the Moon or Mars. Mars is an illustrated training setting: both use simplified game rules based on archived space-weather events.', anchor: 'destinations' },
    { title: 'Pack wisely!', text: 'Your cargo space is limited. Balance Air, Supplies, and batteries with the + and − buttons. Choose Assemble crew when your cargo is ready.', anchor: 'cargo' },
  ],
  assembly: [
    { title: 'Meet your astronauts', text: 'Choose at least one astronaut, up to six. Their suit colors and symbols show their specialties. You will assign their rooms after landing.', anchor: 'crew-candidates' },
    { title: 'Ready to launch?', text: 'Your crew starts together in the dock. Launch when you are happy with your team; you can move astronauts between rooms during the mission.', anchor: 'launch' },
  ],
  play: [
    { title: 'Keep an eye on your meters', text: 'Protect Air, Supplies, and Crew Safety. If a vital meter reaches zero, your mission can end early. These numbers are game units.', anchor: 'meters' },
    { title: 'Place your astronauts', text: 'Tap an astronaut in the crew dock, then tap a room. You can also drag them. Matching suit colors show the specialist for each department.', anchor: 'crew-dock' },
    { title: 'Share your Energy', text: 'Staff a room before powering it. Use the small Energy buttons inside the ship to choose how much power each room receives. Different rooms do different jobs.', anchor: 'ship' },
    { title: 'Watch the forecast', text: 'Tomorrow’s space-weather forecast might be wrong. Prepare shelter protection, care for your crew, and use Research Points for improvements.', anchor: 'forecast' },
    { title: 'Run the day', text: 'Check your plan, then select Run Day. After the animation, read the mission log to learn what really happened. A powered Science Lab with its specialist can unlock discoveries.', anchor: 'run-day' },
  ],
  systems: [
    { title: 'Life Support · Air', text: 'The crew uses Air every day. Staff Life Support and give it Energy to replace Air. Crew care can also improve Crew Safety, but costs Energy and Supplies.', anchor: 'room-lifeSupport' },
    { title: 'Greenhouse · Supplies', text: 'Your Greenhouse helps grow food for the crew. Give it a worker and Energy. Food grown today helps your Supplies on the next day, so plan ahead!', anchor: 'room-greenhouse' },
    { title: 'Science Lab · Discoveries', text: 'A staffed, powered Science Lab earns Research Points. Put the blue science specialist here to work toward extra research bonuses and collectible space-biology discoveries.', anchor: 'room-science' },
    { title: 'Power Station · Storage', text: 'The spacecraft generates Energy each day. Put an astronaut in the Power Station to store unused Energy in your battery. Upgrading this room improves generation and battery space.', anchor: 'room-power' },
    { title: 'Storm Shelter · Crew Safety', text: 'Power the Storm Shelter to reduce damage to Crew Safety during stormy days. Forecasts can be wrong, so prepare protection when the weather looks risky.', anchor: 'room-shield' },
    { title: 'Communications · Earth advice', text: 'With an astronaut here, you can spend Energy to ask Earth for advice. Replies take simulated turns to arrive. Upgrades can help the response arrive sooner.', anchor: 'room-comms' },
    { title: 'Energy · Your daily budget', text: 'Energy powers your staffed rooms and some actions. The first number is Energy planned for today; the second is Energy generated today. Do not spend more than you can generate and draw from the battery.', anchor: 'energy' },
    { title: 'Battery · Save Energy for later', text: 'The battery holds leftover Energy for future days. Staff the Power Station and choose Store to charge it using unused generated Energy. You cannot charge and use the battery on the same day.', anchor: 'battery' },
    { title: 'Research Points · Better rooms', text: 'Power the Science Lab to earn Research Points. Some expeditions and discoveries can grant more. Spend points plus Energy to upgrade a staffed room; the upgrade helps starting the next day.', anchor: 'research' },
  ],
  report: [
    { title: 'Read your mission log', text: 'The log shows the storm that actually occurred and how your choices affected your resources. Compare it with the earlier forecast.', anchor: 'report' },
    { title: 'Plan your next move', text: 'Continue to the next day, or review your final results if the mission has ended. A fresh strategy can make the difference.', anchor: 'report' },
  ],
  debrief: [
    { title: 'Mission complete!', text: 'Review what went well and what you would change. Try again with a new plan, or explore the discoveries your Science Lab collected.', anchor: 'debrief' },
  ],
  collection: [
    { title: 'Your science discoveries', text: 'When the blue Science Lab specialist works in a powered Science Lab, you can unlock new lessons. Your collection is kept on this device until you reset it.', anchor: 'collection' },
  ],
});

export function guideStageForState(state, cinematic) {
  // Keep the discovery celebration and launch/day animations in the foreground.
  if (cinematic || state.discoveryProgress?.popupId) return null;
  if (state.collectionScope) return 'collection';
  if (state.stage === 'menu') return 'menu';
  if (state.stage === 'preparation') return 'preparation';
  if (state.stage === 'crew-assembly') return 'assembly';
  if (state.stage !== 'play') return null;
  const screen = state.session?.screen;
  if (screen === 'planning') return 'play';
  if (screen === 'report') return 'report';
  if (screen === 'debrief') return 'debrief';
  return null;
}

export function normalizeGuidePreferences(input) {
  const source = input && typeof input === 'object' ? input : {};
  const seenStages = Array.isArray(source.seenStages)
    ? [...new Set(source.seenStages.filter(stage => TUTORIAL_STAGES.includes(stage)))] : [];
  return { seenStages, disabledAuto: source.disabledAuto === true };
}
export function readGuidePreferences(storage) {
  if (!storage) return normalizeGuidePreferences(null);
  try { return normalizeGuidePreferences(JSON.parse(storage.getItem(TUTORIAL_STORAGE_KEY))); }
  catch { return normalizeGuidePreferences(null); }
}
export function writeGuidePreferences(storage, input) {
  const prefs = normalizeGuidePreferences(input);
  try { storage?.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(prefs)); } catch { /* private browsing may deny storage */ }
  return prefs;
}
export function markGuideStageSeen(prefs, stage) {
  const saved = normalizeGuidePreferences(prefs);
  if (!TUTORIAL_STAGES.includes(stage) || saved.seenStages.includes(stage)) return saved;
  return { ...saved, seenStages: [...saved.seenStages, stage] };
}
export function skipAutomaticGuide(prefs) {
  return { ...normalizeGuidePreferences(prefs), disabledAuto: true };
}
export function browserGuideStorage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

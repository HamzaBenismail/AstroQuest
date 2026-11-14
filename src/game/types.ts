export type RoomId = 'greenhouse' | 'communications' | 'science' | 'reactor' | 'lifeSupport' | 'shelter';
export type SystemId = 'lifeSupport' | 'communications' | 'science';
export type Budget = Record<SystemId, number>;
export type MissionStatus = 'active' | 'won' | 'lost';

export interface DayReport {
  day: number;
  headline: string;
  explanation: string;
  kind: 'normal' | 'warning' | 'good' | 'danger';
  effects: string[];
}
export interface MissionState {
  day: number;
  totalDays: number;
  oxygen: number;      // gameplay percentage, not a physical measurement
  battery: number;     // gameplay percentage, not kWh
  radiation: number;   // gameplay risk score, NOT absorbed dose or sieverts
  research: number;    // gameplay points
  messages: number;
  budget: Budget;
  shelterPrepared: boolean;
  selectedRoom: RoomId;
  status: MissionStatus;
  report: DayReport;
  history: DayReport[];
}
export const DAILY_POWER = 10;
export const initialState: MissionState = {
  day: 1, totalDays: 5,
  oxygen: 77, battery: 72, radiation: 7, research: 0, messages: 0,
  budget: { lifeSupport: 4, communications: 2, science: 2 },
  shelterPrepared: false, selectedRoom: 'lifeSupport', status: 'active',
  report: {
    day: 1, headline: 'Welcome to Ares Station', kind: 'normal',
    explanation: 'Your crew has five sols to complete its Mars mission. Allocate ten power units each sol. A solar event is forecast for Sol 3.',
    effects: ['Five-sol mission', 'Power budget: 10 units per sol']
  },
  history: []
};
export const ROOM_INFO: Record<RoomId, { name: string; code: string; description: string; note: string }> = {
  greenhouse: {
    name: 'Hydroponic Greenhouse', code: 'GH-06', description: 'Plants can provide food, but growth requires water, lighting, and power.',
    note: 'In this miniature demo, crops are decorative. A future version could track water and food independently.'
  },
  communications: {
    name: 'Communications Hub', code: 'COM-02', description: 'Transmits observations to Earth. Messages can take time to travel between planets.',
    note: 'Allocate at least 2 units to send a science packet each sol.'
  },
  science: {
    name: 'Research Laboratory', code: 'SCI-03', description: 'Studies the Mars environment and collects samples for the mission.',
    note: 'More power produces more research points, but reduces power available for survival.'
  },
  reactor: {
    name: 'Solar Power Core', code: 'PWR-04', description: 'Provides the limited daily power budget and stores backup energy.',
    note: 'Solar events lower generation in this simplified game. Real generation depends on many factors.'
  },
  lifeSupport: {
    name: 'Life Support', code: 'LFS-01', description: 'Maintains breathable air and recycles water inside the habitat.',
    note: 'Allocate more power to slow oxygen loss. Too little life support drains reserves quickly.'
  },
  shelter: {
    name: 'Radiation Shelter', code: 'RAD-05', description: 'A protected compartment for space-weather emergencies.',
    note: 'Preparing the shelter costs 2 power units per sol and reduces the simulated storm risk.'
  }
};

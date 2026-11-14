import { create } from 'zustand';
import { budgetUsed, simulateNextSol } from '../game/simulation';
import { DAILY_POWER, initialState, type MissionState, type RoomId, type SystemId } from '../game/types';

interface MissionActions {
  selectRoom: (id: RoomId) => void;
  changePower: (id: SystemId, delta: number) => void;
  toggleShelter: () => void;
  advanceSol: () => void;
  reset: () => void;
}
type MissionStore = MissionState & MissionActions;
export const useMissionStore = create<MissionStore>((set) => ({
  ...structuredClone(initialState),
  selectRoom: (id) => set({ selectedRoom: id }),
  changePower: (id, delta) => set((s) => {
    if (s.status !== 'active') return s;
    const next = { ...s.budget, [id]: s.budget[id] + delta };
    if (next[id] < 0 || budgetUsed(next, s.shelterPrepared) > DAILY_POWER) return s;
    return { budget: next };
  }),
  toggleShelter: () => set((s) => {
    if (s.status !== 'active') return s;
    if (!s.shelterPrepared && budgetUsed(s.budget, true) > DAILY_POWER) return s;
    return { shelterPrepared: !s.shelterPrepared };
  }),
  advanceSol: () => set((s) => simulateNextSol(s)),
  reset: () => set(structuredClone(initialState)),
}));

import type { Position } from "../api/types.hyperdash";

type Trader = {
  positions: Position[];
};

let state: Trader = {
  positions: [],
};

const listeners = new Set<() => void>();

export const traderStore = {
  getState: () => state,

  setState: (newState: Partial<Trader>) => {
    state = { ...state, ...newState };
    listeners.forEach((l) => l());
  },

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
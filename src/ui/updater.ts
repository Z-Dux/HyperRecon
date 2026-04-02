import type { Balance, Position, OpenOrder } from "../api/types.hyperdash";

type TraderState = {
  positions: Position[];
};

let traderState: TraderState = {
  positions: [],
};

let balanceState: Balance[] = [];

const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const traderStore = {
  getState: () => traderState,

  setState: (partial: Partial<TraderState>) => {
    traderState = { ...traderState, ...partial };
    emit();
  },

  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export const balanceStore = {
  getState: () => balanceState,

  setState: (balances: Balance[]) => {
    balanceState = balances;
    emit();
  },

  updateOne: (coin: string, patch: Partial<Balance>) => {
    balanceState = balanceState.map((b) =>
      b.coin === coin ? { ...b, ...patch } : b
    );
    emit();
  },

  subscribe: traderStore.subscribe,
};


let openOrdersState: OpenOrder[] = [];

export const openOrdersStore = {
  getState: () => openOrdersState,

  setState: (orders: OpenOrder[]) => {
    openOrdersState = orders;
    emit();
  },

  subscribe: traderStore.subscribe,
};
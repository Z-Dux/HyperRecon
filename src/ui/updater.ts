import type {
  Balance,
  Position,
  OpenOrder,
  WsFill,
} from "../api/types.hyperdash";

export type UIOrder = OpenOrder & {
  changed?: {
    size?: boolean;
    price?: boolean;
  };
};

type TraderState = {
  positions: Position[];
};

let traderState: TraderState = {
  positions: [],
};
let fillsState: WsFill[] = [];

let balanceState: Balance[] = [];

let openOrdersState: UIOrder[] = [];

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
      b.coin === coin ? { ...b, ...patch } : b,
    );
    emit();
  },

  subscribe: traderStore.subscribe,
};

export const openOrdersStore = {
  getState: () => openOrdersState,

  setState: (orders: UIOrder[]) => {
    openOrdersState = orders;
    emit();
  },

  subscribe: traderStore.subscribe,
};
export const fillsStore = {
  getState: () => fillsState,

  setState: (fills: WsFill[]) => {
    fillsState = fills;
    emit();
  },

  addFills: (newFills: WsFill[]) => {
    fillsState = [...newFills, ...fillsState].slice(0, 50);
    emit();
  },

  subscribe: traderStore.subscribe,
};

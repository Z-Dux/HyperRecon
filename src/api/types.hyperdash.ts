/**
 * AI generated these types
 */

// ---- Primitive helpers ----
type NumericString = string; // since API returns numbers as strings

// ---- Margin Summary ----
export interface MarginSummary {
  accountValue: NumericString;
  totalNtlPos: NumericString;
  totalRawUsd: NumericString;
  totalMarginUsed: NumericString;
}

// ---- Leverage ----
export type Leverage =
  | {
      type: "cross";
      value: number;
    }
  | {
      type: "isolated";
      value: number;
      rawUsd: NumericString;
    };

// ---- Funding ----
export interface CumFunding {
  allTime: NumericString;
  sinceOpen: NumericString;
  sinceChange: NumericString;
}

// ---- Position ----
export interface Position {
  coin: string;
  szi: NumericString;
  leverage: Leverage;
  entryPx: NumericString;
  positionValue: NumericString;
  unrealizedPnl: NumericString;
  returnOnEquity: NumericString;
  liquidationPx: NumericString | null;
  marginUsed: NumericString;
  maxLeverage: number;
  cumFunding: CumFunding;
}

// ---- Asset Position ----
export interface AssetPosition {
  type: "oneWay"; // extend if needed later
  position: Position;
}

// ---- Clearinghouse State (single entry value) ----
export interface ClearinghouseEntry {
  marginSummary: MarginSummary;
  crossMarginSummary: MarginSummary;
  crossMaintenanceMarginUsed: NumericString;
  withdrawable: NumericString;
  assetPositions: AssetPosition[];
  time: number;
}

// ---- NEW: Tuple form from websocket ----
export type ClearinghouseTuple = [
  clearinghouse: string,
  state: ClearinghouseEntry
];

// ---- NEW: Message for all clearinghouses ----
export interface AllDexsClearinghouseStateMessage {
  channel: "allDexsClearinghouseState";
  data: {
    user: string;
    clearinghouseStates: ClearinghouseTuple[];
  };
}

// ---- Spot Balances ----
export interface SpotBalance {
  coin: string;
  token: number;
  total: NumericString;
  hold: NumericString;
  entryNtl: NumericString;
}

// ---- Spot Clearinghouse ----
export interface SpotClearinghouseState {
  balances: SpotBalance[];
  tokenToAvailableAfterMaintenance: [number, NumericString][];
}

// ---- Account Info (REST shape, NOT websocket) ----
export interface AccountInfo {
  clearinghouseState: Record<string, ClearinghouseEntry>; // keep this (REST format)
  spotClearinghouseState: SpotClearinghouseState;
  userAbstraction: string; // "unifiedAccount"
}

// ---- Generic State Message (spot websocket) ----
export interface StateMessage {
  channel: string;
  data: SpotStateData;
}

// ---- Spot Data Wrapper ----
export interface SpotStateData {
  user: string; // wallet address
  spotState: SpotState;
}

// ---- Spot State ----
export interface SpotState {
  balances: Balance[];
  tokenToAvailableAfterMaintenance: TokenAvailability[];
}

// ---- Individual balance entry ----
export interface Balance {
  coin: string;
  token: number;
  total: NumericString;
  hold: NumericString;
  entryNtl: NumericString;
}

// ---- Tuple type for token availability ----
export type TokenAvailability = [token: number, available: NumericString];

// ---- Open Orders ----

export interface OpenOrder {
  coin: string;
  side: "B" | "S";
  limitPx: NumericString;
  sz: NumericString;
  oid: number;
  timestamp: number;

  triggerCondition: string;
  isTrigger: boolean;
  triggerPx: NumericString;

  children: unknown[];

  isPositionTpsl: boolean;
  reduceOnly: boolean;

  orderType: string;
  origSz: NumericString;

  tif: string;
  cloid: string | null;
}

export interface OpenOrdersData {
  dex: string;
  user: string;
  orders: OpenOrder[];
}

export interface OpenOrdersMessage {
  channel: "openOrders";
  data: OpenOrdersData;
}


export interface WsUserFills {
  isSnapshot?: boolean;
  user: string;
  fills: Array<WsFill>;
}

export interface WsFill {
  coin: string;
  px: string; // price
  sz: string; // size
  side: string;
  time: number;
  startPosition: string;
  dir: string; // used for frontend display
  closedPnl: string;
  hash: string; // L1 transaction hash
  oid: number; // order id
  crossed: boolean; // whether order crossed the spread (was taker)
  fee: string; // negative means rebate
  tid: number; // unique trade id
  liquidation?: FillLiquidation;
  feeToken: string; // the token the fee was paid in
  builderFee?: string; // amount paid to builder, also included in fee
}

export interface FillLiquidation {
  liquidatedUser?: string;
  markPx: number;
  method: "market" | "backstop";
}
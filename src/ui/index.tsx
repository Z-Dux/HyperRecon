#!/usr/bin/env bun

import React, { useState, useEffect } from "react";
import { render, Text, Box } from "ink";
import type { Position } from "../api/types.hyperdash";

type Trader = {
  positions: Position[];
};
import { traderStore } from "./updater";
import { COIN_PRICE } from "../hyperdash";

const fmt = (v?: string | number | null, lim?: number) =>
  v === null || v === undefined
    ? "-"
    : Number(v).toLocaleString("en-US", {
        maximumFractionDigits: lim ?? 7,
      });

const colorPnL = (v: string) => (Number(v) >= 0 ? "green" : "red");

const Header = () => (
  <Box>
    <Box width={12}>
      <Text>ASSET</Text>
    </Box>
    <Box width={8} justifyContent="flex-end">
      <Text>SIZE</Text>
    </Box>
    <Box width={14} justifyContent="flex-end">
      <Text>VALUE</Text>
    </Box>
    <Box width={12} justifyContent="flex-end">
      <Text>ENTRY</Text>
    </Box>
    <Box width={25} justifyContent="flex-end">
      <Text>PNL</Text>
    </Box>
    <Box width={12} justifyContent="flex-end">
      <Text>MARK</Text>
    </Box>
    <Box width={12} justifyContent="flex-end">
      <Text>MARGIN</Text>
    </Box>
    {/*
      <Box width={12}>
        <Text>FUNDING</Text>
      </Box>
    */}
  </Box>
);

const Row = ({ p }: { p: Position }) => {
  const pnl = Number(p.unrealizedPnl);
  const funding = Number(p.cumFunding?.allTime ?? 0);
  const size = Number(p.szi);
  return (
    <Box>
      <Box width={12}>
        <Text bold color={size >= 0 ? "green" : "red"}>
          {`x${p.leverage.value} ` +
            (p.coin.includes(":") ? p.coin.split(":")[1] : p.coin)}
        </Text>
      </Box>

      <Box width={8} justifyContent="flex-end">
        <Text>{fmt(Math.abs(size), 3)}</Text>
      </Box>

      <Box width={14} justifyContent="flex-end">
        <Text>${fmt(p.positionValue, 2)}</Text>
      </Box>

      <Box width={12}justifyContent="flex-end">
        <Text>${fmt(p.entryPx)}</Text>
      </Box>

      <Box width={25} justifyContent="flex-end">
        <Text color={colorPnL(p.unrealizedPnl)}>
          {pnl >= 0 ? "+" : "-"}${fmt(Math.abs(Number(p.unrealizedPnl)), 3)} {`(${pnl>=0 ? "+" : ""}${fmt(100*pnl/Number(p.marginUsed), 2)}%)`}
        </Text>
      </Box>

      <Box width={12} justifyContent="flex-end">
        <Text>${fmt(COIN_PRICE[p.coin])}</Text>
      </Box>

      <Box width={12} justifyContent="flex-end">
        <Text>${fmt(p.marginUsed, 2)}</Text>
      </Box>

      {/*<Box width={12}>
        <Text color={funding >= 0 ? "green" : "red"}>
          {funding >= 0 ? "+" : ""}${fmt(funding, 2)}
        </Text> 
      </Box>*/}
    </Box>
  );
};

const Table = ({ positions }: { positions: Position[] }) => {
  return (
    <Box flexDirection="column">
      <Header />
      <Box marginBottom={1}>
        <Text dimColor>
          ───────────────────────────────────────────────────────────────────────────────────────────────────
        </Text>
      </Box>

      {positions.map((p, i) => (
        <Row key={i} p={p} />
      ))}
    </Box>
  );
};

const App = () => {
  const [trader, setTrader] = useState(traderStore.getState());

  //@ts-ignore
  useEffect(() => {
    return traderStore.subscribe(() => {
      setTrader(traderStore.getState());
    });
  }, []);


  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        POSITIONS ({trader.positions.length})
      </Text>

      <Box marginTop={1}>
        <Table positions={trader.positions} />
      </Box>
    </Box>
  );
};

export function loadUI() {
  render(<App />);
}

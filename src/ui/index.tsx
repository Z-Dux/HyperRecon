#!/usr/bin/env bun

import React, { useEffect, useState } from "react";
import { render, Box, Text, useInput } from "ink";
import type { Position, Balance } from "../api/types.hyperdash";
import { traderStore, balanceStore, openOrdersStore } from "./updater";
import { COIN_PRICE } from "../hyperdash";

const fmt = (v?: string | number | null, d = 2) =>
  v == null
    ? "-"
    : Number(v).toLocaleString("en-US", {
        maximumFractionDigits: d,
      });

const pnlColor = (v: number) => (v >= 0 ? "green" : "red");

const col = (
  value: string,
  width: number,
  align: "left" | "right" = "right",
) => {
  if (value.length > width) return value.slice(0, width);

  const pad = " ".repeat(width - value.length);
  return align === "right" ? pad + value : value + pad;
};

const Header = () => (
  <Text color="cyan">
    {[
      col("ASSET", 12, "left"),
      col("SIZE", 10),
      col("VALUE", 16),
      col("ENTRY", 12),
      col("MARK", 12),
      col("PNL", 26),
      col("MARGIN", 14),
    ].join(" ")}
  </Text>
);

const Row = ({ p }: { p: Position }) => {
  const pnl = Number(p.unrealizedPnl);
  const size = Number(p.szi);

  const asset = `x${p.leverage.value} ${p.coin.split(":").pop()}`;
  const pnlPct = (pnl / Number(p.marginUsed)) * 100;

  return (
    <Box>
      <Text color={size >= 0 ? "green" : "red"}>{col(asset, 15, "left")}</Text>

      <Text>{col(fmt(Math.abs(size), 3), 10)}</Text>

      <Text>{col(`$${fmt(p.positionValue)}`, 16)}</Text>

      <Text>{col(`$${fmt(p.entryPx)}`, 12)}</Text>
      <Text>{col(`$${fmt(COIN_PRICE[p.coin])}`, 12)}</Text>

      <Text color={pnl >= 0 ? "green" : "red"}>
        {col(
          `${pnl >= 0 ? "+" : "-"}$${fmt(Math.abs(pnl))} (${fmt(pnlPct)}%)`,
          26,
        )}
      </Text>

      <Text>{col(`$${fmt(p.marginUsed)}`, 14)}</Text>
    </Box>
  );
};

const OpenOrdersPanel = () => {
  const [orders, setOrders] = useState(openOrdersStore.getState());
  const [offset, setOffset] = useState(0);

  const maxVisible = 6;
  const maxOffset = Math.max(0, orders.length - maxVisible);

  //@ts-ignore
  useEffect(() => {
    return openOrdersStore.subscribe(() =>
      setOrders(openOrdersStore.getState()),
    );
  }, []);

  useInput((input, key) => {
    if (key.leftArrow) {
      setOffset((o) => Math.max(0, o - 1));
    }
    if (key.rightArrow) {
      setOffset((o) => Math.min(maxOffset, o + 1));
    }
  });

  const visible = orders.slice(offset, offset + maxVisible);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      width={80}
      height={12}
    >
      <Text bold>Open Orders</Text>

      <Text dimColor>
        {[
          col("ASSET", 12, "left"),
          col("SIDE", 6),
          col("SIZE", 22),
          col("PRICE", 12),
          col("VALUE", 16),
        ].join(" ")}
      </Text>

      <Text dimColor>{"-".repeat(75)}</Text>

      {visible.map((o) => {
        const size = Number(o.sz);
        const price = Number(o.limitPx);
        const value = size * price;

        const asset = o.coin.split(":").pop();
        const side = o.side === "B" ? "Buy" : "Sell";

        return (
          <Text key={o.oid}>
            {col(asset || "-", 12, "left")}{" "}
            <Text color={o.side === "B" ? "green" : "red"}>{col(side, 6)}</Text>{" "}
            <Text color={o.changed?.size ? "magenta" : undefined}>
              {col(`${fmt(size, 6)} ${asset}`, 22)}
            </Text>{" "}
            <Text color={o.changed?.price ? "magenta" : undefined}>
              {col(`$${fmt(price)}`, 12)}
            </Text>{" "}
            {col(`$${fmt(value)}`, 16)}
          </Text>
        );
      })}

      <Text dimColor>
        {offset > 0 ? "← " : "  "}
        {offset + maxVisible < orders.length ? "→" : " "}
      </Text>
    </Box>
  );
};

const Table = ({ positions }: { positions: Position[] }) => (
  <Box flexDirection="column">
    <Header />
    <Text dimColor>{"-".repeat(110)}</Text>

    {positions.map((p, i) => (
      <Row key={i} p={p} />
    ))}
  </Box>
);

const Portfolio = ({ positions }: { positions: Position[] }) => {
  const [balances, setBalances] = useState<Balance[]>(balanceStore.getState());
  //@ts-ignore
  useEffect(() => {
    return balanceStore.subscribe(() => setBalances(balanceStore.getState()));
  }, []);

  const totalBalance = balances.reduce((a, b) => a + Number(b.total), 0);

  const totalPnL = positions.reduce((a, p) => a + Number(p.unrealizedPnl), 0);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="red"
      padding={1}
      width={32}
    >
      <Text bold>Portfolio</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Value: <Text color="cyan">${fmt(totalBalance)}</Text>
        </Text>

        <Text>
          PnL:{" "}
          <Text color={pnlColor(totalPnL)}>
            {totalPnL >= 0 ? "+" : ""}${fmt(totalPnL)}
          </Text>
        </Text>

        <Text dimColor>Positions: {positions.length}</Text>
      </Box>
    </Box>
  );
};

const Live = () => (
  <Box
    //marginTop={1}
    borderStyle="round"
    borderColor="red"
    height={"auto"}
    padding={1}
    width={66}
  >
    <Text dimColor>To be added soon...</Text>
  </Box>
);

const App = () => {
  const [state, setState] = useState(traderStore.getState());

  //@ts-ignore
  useEffect(() => {
    return traderStore.subscribe(() => setState(traderStore.getState()));
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginLeft={70}>
        <Text bold color="cyan">
          HyperRecon
        </Text>
      </Box>

      <Box marginTop={1}>
        <Box marginRight={2}>
          <Box borderStyle="round" borderColor="cyan" padding={1}>
            <Table positions={state.positions} />
          </Box>
        </Box>

        <Portfolio positions={state.positions} />
      </Box>

      <Box marginTop={1} gap={2}>
        <Live />
        <OpenOrdersPanel />
      </Box>
    </Box>
  );
};

export const loadUI = () => render(<App />);

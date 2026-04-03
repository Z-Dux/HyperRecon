import {
  connectHyperLiquid,
  getAccountInfo,
  parseWebsocketMessage,
} from "./api/hyperdash";
import type {
  AccountInfo,
  AllDexsClearinghouseStateMessage,
  OpenOrder,
  SpotBalance,
  WsFill,
  WsUserFills,
} from "./api/types.hyperdash";
import type { UIOrder } from "./ui/updater";
import { balanceStore, fillsStore, openOrdersStore, traderStore } from "./ui/updater";
export const COIN_PRICE: Record<string, number> = {};
export class HyperDash {
  walletAddress: string;
  orders: OpenOrder[] = [];
  orderFills: WsFill[] = [];
  constructor(address: string) {
    this.walletAddress = address;
  }
  async info(): Promise<AccountInfo> {
    return await getAccountInfo({ user: this.walletAddress });
  }
  async getBalances(): Promise<SpotBalance[]> {
    const accountInfo = await this.info();
    return accountInfo.spotClearinghouseState.balances;
  }
  async listenUpdates() {
    const ws = await connectHyperLiquid({});

    ws.data.on("data", (msg) => {
      switch (msg.channel) {
        case "spotState":
          const spotData = parseWebsocketMessage(msg, "spotState");
          //only balance matters
          balanceStore.setState(spotData.spotState.balances);
          let str = ``;
          for (const balance of spotData.spotState.balances) {
            str += `${balance.coin}: ${balance.total} (hold: ${balance.hold}) | token: ${balance.token} | entry: ${balance.entryNtl}\n`;
          }
          //console.log("Balance Updates:\n", str);
          break;
        case "pong":
          //console.log("Pong received");
          break;
        case "allDexsClearinghouseState":
          const clearinghouseData =
            msg.data as AllDexsClearinghouseStateMessage["data"];

          const logs = [];

          for (const [dex, state] of clearinghouseData.clearinghouseStates) {
            if (state.assetPositions.length > 0) {
              logs.push(
                state.assetPositions.map(
                  (pos) => pos.position,
                  //`$${pos.position.coin.includes(":") ? pos.position.coin.split(":")[1] : pos.position.coin} | Entry: ${Number(pos.position.entryPx).toFixed(2)} | Size: ${Number(pos.position.szi).toFixed(2)} x${pos.position.leverage.value} | Value: ${Number(pos.position.positionValue).toFixed(2)} | Unrealized PnL: ${Number(pos.position.unrealizedPnl).toFixed(2)} | ROE: ${Number(pos.position.returnOnEquity).toFixed(2)}% | Liquidation Price: ${pos.position.liquidationPx ? Number(pos.position.liquidationPx).toFixed(2) : "N/A"} | Margin Used: ${Number(pos.position.marginUsed).toFixed(2)} | Max Leverage: ${pos.position.maxLeverage} | Cum Funding: ${Number(pos.position.cumFunding.allTime).toFixed(2)}`,
                ),
              );
            }
          }

          traderStore.setState({
            positions: logs.flat(),
          });

          break;
        case "allMids":
          const mids = msg.data.mids as Array<Record<string, string>>;
          for (const [coin, price] of Object.entries(mids)) {
            COIN_PRICE[coin] = Number(price);
          }
          break;
        case "openOrders":
          const openOrdersData = msg.data.orders as OpenOrder[];

          this.inferenceOpenOrders(openOrdersData);
          return;
        case "userFills":
          const userFillsData = msg.data as WsUserFills;
          console.log(
            "✅ New Fills:",
            userFillsData.fills.map((x) => x.oid).join(", "),
          ); //, userFillsData.fills);
          this.orderFills = userFillsData.fills;
          fillsStore.addFills(userFillsData.fills);
          return;
        default:
          console.log("🔻", msg.channel, msg);

          break;
      }
    });
    ws.data.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
    ws.data.on("close", () => {
      console.log("WebSocket connection closed");
    });

    ws.send({ method: "ping" });
    //get live account balance
    ws.send({
      method: "subscribe",
      subscription: {
        type: "spotState",
        user: this.walletAddress,
        ignorePortfolioMargin: false,
      },
    });

    //live position updates
    ws.send({
      method: "subscribe",
      subscription: {
        type: "allDexsClearinghouseState",
        user: this.walletAddress,
      },
    });

    //get price
    ws.send({
      method: "subscribe",
      subscription: { type: "allMids", dex: "ALL_DEXS" },
    });
    //open orders
    ws.send({
      method: "subscribe",
      subscription: {
        type: "openOrders",
        user: this.walletAddress,
        dex: "ALL_DEXS",
      },
    });

    ws.send({
      method: "subscribe",
      subscription: {
        type: "userFills",
        user: this.walletAddress,
        aggregateByTime: true,
      },
    });
  }
  async inferenceOpenOrders(orders: OpenOrder[]) {
    if (orders.length !== 0 && this.orders.length === 0) {
      this.orders = [...orders];
      openOrdersStore.setState(orders);
      return;
    }

    const prevOrdersMap = new Map(this.orders.map((o) => [o.oid, o]));
    const nextOrdersMap = new Map(orders.map((o) => [o.oid, o]));

    const removedOrders: OpenOrder[] = [];

    for (const [oid, order] of prevOrdersMap) {
      if (!nextOrdersMap.has(oid)) {
        removedOrders.push(order);
      }
    }

    const percentDiff = (a: number, b: number) => {
      if (a === 0 && b === 0) return 0;
      return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
    };

    const enrichedOrders: UIOrder[] = [];

    for (const [oid, order] of nextOrdersMap) {
      const existing = prevOrdersMap.get(oid);

      if (existing) {
        const sizeChanged = existing.sz !== order.sz;
        const priceChanged = existing.limitPx !== order.limitPx;

        if (sizeChanged || priceChanged) {
          console.log(
            `🔄 Updated Order: ${order.coin} | OID: ${oid} | Size: ${existing.sz} → ${order.sz} | Px: ${existing.limitPx} → ${order.limitPx}`,
          );
        }

        enrichedOrders.push({
          ...order,
          changed: {
            size: sizeChanged,
            price: priceChanged,
          },
        });

        continue;
      }

      // replace detection
      const newPx = Number(order.limitPx);
      const newSz = Number(order.sz);

      let matchedOld: OpenOrder | null = null;

      for (const old of removedOrders) {
        if (old.coin === order.coin && old.side === order.side) {
          const oldPx = Number(old.limitPx);
          const oldSz = Number(old.sz);

          const pxDiff = percentDiff(oldPx, newPx);
          const szDiff = percentDiff(oldSz, newSz);

          if (pxDiff <= 0.2 && szDiff <= 0.2) {
            matchedOld = old;
            break;
          }
        }
      }

      if (matchedOld) {
        console.log(
          `🔁 Replaced Order: ${order.coin} | ${matchedOld.oid} → ${oid}`,
        );

        enrichedOrders.push({
          ...order,
          changed: {
            size: true,
            price: true,
          },
        });

        const idx = removedOrders.findIndex((o) => o.oid === matchedOld!.oid);
        if (idx !== -1) removedOrders.splice(idx, 1);
      } else {
        console.log(`🆕 New Order: ${order.coin} | OID: ${oid}`);

        enrichedOrders.push(order);
      }
    }

    for (const order of removedOrders) {
      console.log(`❌ Order Removed: ${order.coin} | OID: ${order.oid}`);
    }

    this.orders = [...orders];
    openOrdersStore.setState(enrichedOrders);
  }
}

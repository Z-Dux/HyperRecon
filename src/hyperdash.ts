import {
  connectHyperLiquid,
  getAccountInfo,
  parseWebsocketMessage,
} from "./api/hyperdash";
import type {
  AccountInfo,
  AllDexsClearinghouseStateMessage,
  SpotBalance,
} from "./api/types.hyperdash";

export class HyperDash {
  walletAddress: string;
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
          let str = ``;
          for (const balance of spotData.spotState.balances) {
            str += `${balance.coin}: ${balance.total} (hold: ${balance.hold}) | token: ${balance.token} | entry: ${balance.entryNtl}\n`;
          }
          //console.log("📊 Balance Updates:\n", str);
          break;
        case "pong":
          //console.log("🏓 Pong received");
          break;
        case "allDexsClearinghouseState":
          const clearinghouseData =
            msg.data as AllDexsClearinghouseStateMessage["data"];

          const logs = [];

          for (const [dex, state] of clearinghouseData.clearinghouseStates) {
            if (state.assetPositions.length > 0) {
              logs.push(
                state.assetPositions.map(
                  (pos) =>
                    `$${pos.position.coin.includes(":") ? pos.position.coin.split(":")[1] : pos.position.coin} | Entry: ${Number(pos.position.entryPx).toFixed(2)} | Size: ${Number(pos.position.szi).toFixed(2)} x${pos.position.leverage.value} | Value: ${Number(pos.position.positionValue).toFixed(2)} | Unrealized PnL: ${Number(pos.position.unrealizedPnl).toFixed(2)} | ROE: ${Number(pos.position.returnOnEquity).toFixed(2)}% | Liquidation Price: ${pos.position.liquidationPx ? Number(pos.position.liquidationPx).toFixed(2) : "N/A"} | Margin Used: ${Number(pos.position.marginUsed).toFixed(2)} | Max Leverage: ${pos.position.maxLeverage} | Cum Funding: ${Number(pos.position.cumFunding.allTime).toFixed(2)}`,
                ),
              );
            }
          }
          console.log(`📊 Clearinghouse Updates:`);
          logs.flat().forEach((log) => console.log(log));
          break;
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
        user: "0x8434b7844fd17fad52f0aceae50a834cd4896577",
        ignorePortfolioMargin: false,
      },
    });

    //live position updates
    ws.send({
      method: "subscribe",
      subscription: {
        type: "allDexsClearinghouseState",
        user: "0x8434b7844fd17fad52f0aceae50a834cd4896577",
      },
    });
  }
}

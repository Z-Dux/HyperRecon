import { connect, TLSSocket } from "tls";
import { randomBytes, createHash } from "crypto";
import { EventEmitter } from "events";
import type {
  AccountInfo,
  AllDexsClearinghouseStateMessage,
  SpotStateData,
} from "./types.hyperdash";

const BASE_URL = "https://hyperdash.com/api";
const wallet = "0x8434b7844fd17fad52f0aceae50a834cd4896577";

type WSOptions = {
  host: string;
  path: string;
  port?: number;
  origin?: string;
};

function generateKey(): string {
  return randomBytes(16).toString("base64");
}

export async function getAccountInfo(params: {
  user: string;
  dex?: string;
}): Promise<AccountInfo> {
  const { dex = "ALL_DEXES" } = params;
  const res = await fetch(`${BASE_URL}/h/info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "portfolioState",
      user: params.user,
      dex: dex,
    }),
  });

  const data = (await res.json()) as AccountInfo;
  return data;
}

export async function connectHyperLiquid({
  host = "api-ui.hyperliquid.xyz",
  path = "/ws",
  port = 443,
  origin = "https://hyperdash.com",
}: Partial<WSOptions>) {
  return new Promise<{
    socket: TLSSocket;
    send: (payload: any) => void;
    data: EventEmitter;
  }>((resolve, reject) => {
    const wsKey = generateKey();
    const emitter = new EventEmitter();

    const socket = connect(
      {
        host,
        port,
        servername: host,
        checkServerIdentity: () => undefined,
      },
      () => {
        const request =
          `GET ${path} HTTP/1.1\r\n` +
          `Host: ${host}\r\n` +
          `Connection: Upgrade\r\n` +
          `Upgrade: websocket\r\n` +
          `Sec-WebSocket-Version: 13\r\n` +
          `Sec-WebSocket-Key: ${wsKey}\r\n` +
          //`Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits\r\n` +
          `Origin: ${origin}\r\n` +
          `Pragma: no-cache\r\n` +
          `Cache-Control: no-cache\r\n` +
          `Accept-Language: en-US,en;q=0.9\r\n` +
          `\r\n`;

        socket.write(request);
      },
    );

    let buffer = "";

    socket.on("data", (data) => {
      buffer += data.toString();

      if (!buffer.includes("\r\n\r\n")) return;

      const [headerPart] = buffer.split("\r\n\r\n");

      if (!headerPart) {
        reject(new Error("Invalid handshake response"));
        socket.end();
        return;
      }

      const statusOk = headerPart.includes("101 Switching Protocols");
      const acceptMatch = headerPart.match(/Sec-WebSocket-Accept: (.*)/i);

      if (!statusOk) {
        reject(new Error("Handshake failed: not 101"));
        socket.end();
        return;
      }

      if (!acceptMatch?.[1]) {
        reject(new Error("Missing Sec-WebSocket-Accept"));
        socket.end();
        return;
      }

      const expectedAccept = createHash("sha1")
        .update(wsKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
        .digest("base64");

      if (acceptMatch[1].trim() !== expectedAccept) {
        reject(new Error("Invalid Sec-WebSocket-Accept"));
        socket.end();
        return;
      }

      // ✅ handshake done
      socket.removeAllListeners("data");

      function send(payload: any) {
        const json =
          typeof payload === "string" ? payload : JSON.stringify(payload);

        const data = Buffer.from(json, "utf8");
        const frame: number[] = [];

        frame.push(0x81); // FIN + text

        if (data.length < 126) {
          frame.push(0x80 | data.length);
        } else if (data.length < 65536) {
          frame.push(0x80 | 126);
          frame.push((data.length >> 8) & 0xff, data.length & 0xff);
        } else {
          frame.push(0x80 | 127);
          for (let i = 7; i >= 0; i--) {
            frame.push((data.length >> (8 * i)) & 0xff);
          }
        }

        const mask = randomBytes(4);

        const masked = Buffer.alloc(data.length);
        for (let i = 0; i < data.length; i++) {
          //@ts-ignore
          masked[i] = data[i] ^ mask[i % 4];
        }

        const out = Buffer.concat([Buffer.from(frame), mask, masked]);
        socket.write(out);
        console.log("🔺", json);
      }

      // frame parrser
      let messageBuffer: Buffer = Buffer.alloc(0);
      let fragmentedOpcode: number | null = null;

      let frameBuffer = Buffer.alloc(0);

      socket.on("data", (chunk: Buffer) => {
        frameBuffer = Buffer.concat([frameBuffer, chunk]);

        let offset = 0;

        while (true) {
          if (frameBuffer.length < 2) break;

          const byte1 = frameBuffer[offset];
          const byte2 = frameBuffer[offset + 1];
          if (!byte1 || !byte2) break;
          const fin = (byte1 & 0x80) !== 0;
          const opcode = byte1 & 0x0f;

          let payloadLen = byte2 & 0x7f;
          let headerLen = 2;

          if (payloadLen === 126) {
            if (frameBuffer.length < 4) break;
            payloadLen = frameBuffer.readUInt16BE(2);
            headerLen += 2;
          } else if (payloadLen === 127) {
            if (frameBuffer.length < 10) break;
            payloadLen = Number(frameBuffer.readBigUInt64BE(2));
            headerLen += 8;
          }

          if (frameBuffer.length < headerLen + payloadLen) break;

          const payload = frameBuffer.slice(headerLen, headerLen + payloadLen);

          frameBuffer = frameBuffer.slice(headerLen + payloadLen);

          handleFrame(opcode, fin, payload);
        }
      });
      function handleFrame(opcode: number, fin: boolean, payload: Buffer) {
        if (opcode === 0x8) {
          socket.end();
          emitter.emit("close");
          return;
        }

        if (opcode === 0x9) {
          socket.write(Buffer.from([0x8a, 0x00]));
          return;
        }

        if (opcode === 0x1) {
          const msg = payload.toString("utf8");

          try {
            emitter.emit("data", JSON.parse(msg));
          } catch (e) {
            console.log("❌ BAD FRAME:", msg);
          }
        }
      }
      socket.on("error", (err) => emitter.emit("error", err));
      socket.on("end", () => emitter.emit("close"));

      resolve({
        socket,
        send,
        data: emitter,
      });
    });

    socket.on("error", reject);
    socket.on("end", () => reject(new Error("Connection closed")));
  });
}

type WSMessageType = "spotState" | "portfolioState" | "ping" | string;

export function parseWebsocketMessage(
  msg: any,
  type: WSMessageType,
): SpotStateData {
  switch (type) {
    case "spotState":
      return msg.data as SpotStateData;
    default:
      throw new Error(`Unhandled message type: ${type}`);
  }
}

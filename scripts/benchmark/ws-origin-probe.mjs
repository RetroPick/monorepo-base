import net from "node:net";
import crypto from "node:crypto";

const host = process.env.WS_HOST ?? "retropick-api";
const port = Number(process.env.WS_PORT ?? "8080");
const path = process.env.WS_PATH ?? "/ws";
const origins = (process.env.WS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000,http://retropick-web:3000").split(",");

function probe(origin) {
  return new Promise((resolve) => {
    const key = crypto.randomBytes(16).toString("base64");
    const req = [
      `GET ${path} HTTP/1.1`,
      `Host: ${host}:${port}`,
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Key: ${key}`,
      "Sec-WebSocket-Version: 13",
      `Origin: ${origin}`,
      "",
      "",
    ].join("\r\n");

    const socket = net.createConnection({ host, port }, () => socket.write(req));
    let raw = "";
    socket.setTimeout(3000);
    socket.on("data", (chunk) => {
      raw += chunk.toString();
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ origin, statusLine: "TIMEOUT" });
    });
    socket.on("error", (error) => {
      resolve({ origin, statusLine: `ERROR ${error.message}` });
    });
    socket.on("close", () => {
      resolve({ origin, statusLine: raw.split("\r\n")[0] || "NO_RESPONSE" });
    });
  });
}

const results = [];
for (const origin of origins) {
  results.push(await probe(origin));
}

console.log(JSON.stringify({
  host,
  port,
  path,
  measuredAt: new Date().toISOString(),
  results,
}, null, 2));

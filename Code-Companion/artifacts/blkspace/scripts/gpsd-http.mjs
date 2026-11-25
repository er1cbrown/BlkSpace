/**
 * Serves the latest gpsd fix as JSON for the Maps page.
 *
 * gpsd speaks its own protocol on TCP 2947. The browser cannot read that.
 * This bridge watches gpsd and answers GET /fix on port 2948.
 *
 *   bun scripts/gpsd-http.mjs
 *
 * It listens on the local network so a phone on the car Wi-Fi can poll it.
 * The body is only the latest fix: mode, lat, lon, time.
 */
import http from "node:http";
import net from "node:net";

const gpsdHost = process.env.GPSD_HOST || "127.0.0.1";
const gpsdPort = Number(process.env.GPSD_PORT || 2947);
const httpHost = process.env.GPSD_HTTP_HOST || "0.0.0.0";
const httpPort = Number(process.env.GPSD_HTTP_PORT || 2948);

let latest = { mode: 0, lat: null, lon: null, time: null };

function remember(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (!msg || msg.class !== "TPV") return;
  latest = {
    mode: Number(msg.mode) || 0,
    lat: Number.isFinite(Number(msg.lat)) ? Number(msg.lat) : null,
    lon: Number.isFinite(Number(msg.lon)) ? Number(msg.lon) : null,
    time: typeof msg.time === "string" ? msg.time : null,
  };
}

function watchGpsd() {
  const socket = net.connect({ host: gpsdHost, port: gpsdPort });
  let buffer = "";
  let stopped = false;
  const again = () => {
    if (stopped) return;
    stopped = true;
    socket.destroy();
    setTimeout(watchGpsd, 2000);
  };
  socket.on("connect", () => {
    socket.write('?WATCH={"enable":true,"json":true}\n');
  });
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let splitAt = buffer.indexOf("\n");
    while (splitAt >= 0) {
      remember(buffer.slice(0, splitAt));
      buffer = buffer.slice(splitAt + 1);
      splitAt = buffer.indexOf("\n");
    }
  });
  socket.on("error", again);
  socket.on("close", again);
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const path = (req.url || "/").split("?")[0];
  if (req.method === "GET" && path === "/fix") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(latest));
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

server.listen(httpPort, httpHost, () => {
  console.log(`gpsd bridge http://${httpHost}:${httpPort}/fix`);
  watchGpsd();
});

/**
 * Driving routes for the Maps page, on port 5000.
 *
 * Town roads, GeoJSON LineStrings that share their endpoints:
 *   ROADS_FILE=roads.json bun scripts/osrm-http.mjs
 *
 * A full state extract uses the official router instead:
 *   OSRM_BIN=osrm-routed OSRM_FILE=georgia.osrm bun scripts/osrm-http.mjs
 *
 * With no road file, /route answers "No road file is loaded."
 */
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { edgesFromGeoJSON, routeDrivingWire } from "../src/lib/deck-roads.ts";

const host = process.env.OSRM_HOST || "0.0.0.0";
const port = Number(process.env.OSRM_PORT || 5000);
const bin = process.env.OSRM_BIN || "";
const official = process.env.OSRM_FILE || "";

if (bin && official) {
  const child = spawn(bin, ["--ip", host, "--port", String(port), official], {
    stdio: "inherit",
  });
  child.on("exit", (code) => process.exit(code ?? 1));
} else {
  function readJson(path) {
    let text = fs.readFileSync(path, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return JSON.parse(text);
  }

  const file = process.env.ROADS_FILE || "";
  let graph = edgesFromGeoJSON({ features: [] });
  if (file) {
    let parsed;
    try {
      parsed = readJson(file);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Could not read ROADS_FILE");
      process.exit(1);
    }
    graph = edgesFromGeoJSON(parsed);
    if (graph.nodes.size === 0) {
      console.error("ROADS_FILE has no road lines.");
      process.exit(1);
    }
  }

  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const match = url.pathname.match(/^\/route\/v1\/driving\/(.+)$/);
    if (req.method === "GET" && match) {
      const points = match[1]
        .split(";")
        .map((pair) => {
          const [lon, lat] = pair.split(",");
          return { lon: Number(lon), lat: Number(lat) };
        })
        .filter((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(routeDrivingWire(graph, points)));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });

  server.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(
      `road router http://${host}:${port}/route (${graph.nodes.size} crossings)`,
    );
  });
}

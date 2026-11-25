/**
 * Local search for the Maps page, on port 8088.
 *
 *   POI_FILE=pois.json bun scripts/search-http.mjs
 *
 * pois.json is a list of { name, lat, lon, kind }.
 * kind "fuel" answers "gas station". Other names match the query text.
 * With no file, /search returns an empty list.
 */
import fs from "node:fs";
import http from "node:http";
import { poisFromJson, searchPois } from "../src/lib/deck-search.ts";

const host = process.env.SEARCH_HOST || "0.0.0.0";
const port = Number(process.env.SEARCH_PORT || 8088);
const file = process.env.POI_FILE || "";

function readJson(path) {
  let text = fs.readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

let pois = [];
if (file) {
  let parsed;
  try {
    parsed = readJson(file);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not read POI_FILE");
    process.exit(1);
  }
  pois = poisFromJson(parsed);
  if (pois.length === 0) {
    console.error("POI_FILE has no usable places.");
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
  if (req.method === "GET" && url.pathname === "/search") {
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const near =
      Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
    const hits = searchPois(pois, {
      q: url.searchParams.get("q") || "",
      near,
      limit: Number(url.searchParams.get("limit") || 1),
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        hits.map((hit) => ({
          lat: String(hit.lat),
          lon: String(hit.lon),
          display_name: hit.name,
        })),
      ),
    );
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
  console.log(`local search http://${host}:${port}/search (${pois.length} places)`);
});

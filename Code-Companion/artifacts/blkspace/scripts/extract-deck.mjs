/**
 * Turn an OSM XML or Overpass JSON extract into pois.json and roads.json.
 *
 *   bun scripts/extract-deck.mjs map.osm
 *   OUT_DIR=./out bun scripts/extract-deck.mjs map.json
 *
 * PBF is not parsed. A full state stays on official OSRM (OSRM_BIN + OSRM_FILE).
 */
import fs from "node:fs";
import path from "node:path";
import { convertMapExtract } from "../src/lib/deck-extract.ts";

const input = process.argv[2];
if (!input) {
  console.error("Usage: bun scripts/extract-deck.mjs map.osm");
  process.exit(1);
}
if (/\.pbf$/i.test(input)) {
  console.error("PBF is not parsed. Export OSM XML or Overpass JSON.");
  process.exit(1);
}

let text;
try {
  text = fs.readFileSync(input, "utf8");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not read the map extract.");
  process.exit(1);
}
if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

let extracted;
try {
  extracted = convertMapExtract(text);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not read the map extract.");
  process.exit(1);
}
if (extracted.pois.length === 0 && extracted.roads.features.length === 0) {
  console.error("Extract has no places and no driving roads.");
  process.exit(1);
}

const dir = process.env.OUT_DIR || process.cwd();
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "pois.json"), `${JSON.stringify(extracted.pois, null, 2)}\n`);
fs.writeFileSync(path.join(dir, "roads.json"), `${JSON.stringify(extracted.roads, null, 2)}\n`);
console.log(`pois ${extracted.pois.length}, roads ${extracted.roads.features.length}`);

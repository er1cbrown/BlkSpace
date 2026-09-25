#!/usr/bin/env bun
/**
 * Run deterministic WeixNet route simulations.
 *
 * Usage:
 *   bun run simulate:routes
 *   bun run simulate:routes healthy
 *   bun run simulate:routes all
 */

import {
  runWeixNetSimulation,
  WEIXNET_SIMULATION_SCENARIOS,
} from "../src/lib/weixnet-route-simulator.ts";

const requested = process.argv[2] ?? "all";
const scenarios =
  requested === "all"
    ? WEIXNET_SIMULATION_SCENARIOS
    : WEIXNET_SIMULATION_SCENARIOS.filter(
        (scenario) => scenario.id === requested,
      );

if (scenarios.length === 0) {
  console.error(
    `Unknown scenario "${requested}". Available: ${WEIXNET_SIMULATION_SCENARIOS.map(
      (scenario) => scenario.id,
    ).join(", ")}`,
  );
  process.exit(1);
}

const results = scenarios.map((scenario) => runWeixNetSimulation(scenario));
console.log(JSON.stringify({ mode: "simulation", results }, null, 2));

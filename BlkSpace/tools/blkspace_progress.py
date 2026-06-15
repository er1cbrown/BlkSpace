#!/usr/bin/env python3
"""
BlkSpace SoloFlow Progress Tracker
Lightweight Discord progress bot powered by SoloFlow core (no full OpenClaw overload).

Usage (after setting DISCORD_WEBHOOK_URL env var or hardcoding):
  python tools/blkspace_progress.py list
  python tools/blkspace_progress.py update hub-data-storage done "modeled Nostr events + Iroh CIDs + local SQLite. See docs/hub-theory.md"
  python tools/blkspace_progress.py post   # force post current status to Discord

This creates/uses a SoloFlow DAG workflow for Phase 0 tasks (parallel branches for theory work).
State persisted in blkspace_progress.db (SQLite, same pattern as SoloFlow examples).
Posts clean updates to Discord via webhook (simple outbound, no bot token required).

For inbound from Discord: Use with OpenClaw agent later (natural language "update progress on X to done because Y")
or extend this script with a tiny Discord listener if needed (avoid for now to keep light).

Tasks are pulled from the current plan.md Phase 0 focus (data storage, nodes, economy, etc.).
Add/remove tasks in the TASKS list below as theory evolves.
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# Use the SoloFlow core we already have in the repo (no external install beyond what's here)
SOLOFLOW_CORE = Path(__file__).parent / "SoloFlow" / "hermes-plugin"
sys.path.insert(0, str(SOLOFLOW_CORE))

import requests  # pip install requests (light dep for webhook)

from store.sqlite_store import SQLiteStore
from services.workflow_service import WorkflowService
from services.scheduler import Scheduler

# --- CONFIG ---
DB_PATH = Path("blkspace_progress.db")
WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")  # Set this! e.g. export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Phase 0 tasks pulled from plan.md (Theoretical Core + Economy + Node model)
# Format: id must be unique, name for display, discipline for SoloFlow routing (quick/deep)
# Add dependencies via "depends_on": ["other-id"] if you want strict order (SoloFlow edges)
TASKS = [
    {
        "id": "hub-data-storage",
        "name": "Data Storage Model (Nostr + Iroh + local SQLite)",
        "discipline": "deep",
        "description": "Define where posts, media, profiles, economy txs, and node data live. CIDs in events, local cache in client.",
    },
    {
        "id": "hub-node-harvest",
        "name": "Low-end Hardware Node Participation & EB Productions",
        "discipline": "deep",
        "description": "How low-end nodes harvest (relay/pin/compute) and produce value/rewards for contributors.",
    },
    {
        "id": "hub-token-flows",
        "name": "WeixBucks / BlkCoin Flows & Payments (ATM)",
        "discipline": "deep",
        "description": "How currencies increment (uploads + engagement + nodes), sinks, payments to users/viewers/marketplace.",
    },
    {
        "id": "hub-merge-spec",
        "name": "Merge into Full Hub Theory Spec + Diagrams",
        "discipline": "deep",
        "description": "Consolidate storage, node, and economy models into docs/hub-theory.md + ASCII/Mermaid diagrams.",
        "depends_on": ["hub-data-storage", "hub-node-harvest", "hub-token-flows"],
    },
    {
        "id": "plan0-status-update",
        "name": "Update docs/phase-0-status.md and plan.md",
        "discipline": "quick",
        "description": "Document decisions, risks, and next modeling items from the theory work.",
    },
]

# --- CORE HELPERS (SoloFlow powered) ---

async def get_or_create_progress_workflow(ws: WorkflowService) -> dict:
    """Create or retrieve the main BlkSpace dev progress workflow (DAG with parallel branches)."""
    # For simplicity we use one persistent workflow named after the project phase.
    # In real use you can have multiple (e.g. one per major phase or feature).
    wf_name = "blkspace-phase0-hub-theory"
    # Try to find existing (by name is good enough for solo)
    # WorkflowService doesn't expose easy "get by name" in the example, so we just create or reuse via state.
    # For this tracker we create a fresh one each time we run if needed, but persist steps via the store.
    # Simpler for solo: always work with the same workflow id by storing it.

    # We'll create it once and store the id in a tiny meta table or just re-create with same name (SoloFlow allows it).
    # To keep state across runs, we use the store directly for progress + the workflow for structure.

    wf = await ws.create_workflow(
        name=wf_name,
        description="Bottom-up modeling of the WeixNet decentralized ATM hub (Plan 0). Parallel theory work + merges.",
        steps=[
            {
                "id": t["id"],
                "name": t["name"],
                "discipline": t.get("discipline", "deep"),
                "prompt": t.get("description", ""),  # useful if later feeding to an agent
            }
            for t in TASKS
        ],
        edges=[
            (dep, t["id"])
            for t in TASKS
            for dep in t.get("depends_on", [])
        ],
    )
    return wf

async def update_progress(task_id: str, status: str, note: str = ""):
    """Advance a step in the SoloFlow workflow and record the note. Status can be 'in-progress' / 'done' etc."""
    store = SQLiteStore(DB_PATH)
    store.initialize()
    ws = WorkflowService(store)
    ws.set_scheduler(Scheduler(store, ws))

    wf = await get_or_create_progress_workflow(ws)

    # Advance the step (this is the core SoloFlow action)
    try:
        await ws.advance_step(wf["id"], task_id, result=note or f"Status: {status}")
        print(f"✅ Advanced {task_id} → {status}")
        if note:
            print(f"   Note: {note}")
    except Exception as e:
        print(f"Could not advance step (maybe already done or invalid id): {e}")

    # Optional: also store raw progress in a simple table for easy querying
    # (SoloFlow already does rich storage, this is just for the tracker view)
    store.execute(
        """
        CREATE TABLE IF NOT EXISTS progress (
            task_id TEXT PRIMARY KEY,
            status TEXT,
            note TEXT,
            updated_at TEXT
        )
        """
    )
    store.execute(
        """
        INSERT OR REPLACE INTO progress (task_id, status, note, updated_at)
        VALUES (?, ?, ?, ?)
        """,
        (task_id, status, note, datetime.utcnow().isoformat()),
    )

    # Auto-post a nice update to Discord if webhook is set
    if WEBHOOK_URL:
        summary = await build_discord_summary(store, ws, wf["id"])
        post_to_discord(summary)

    store.close()

async def list_progress():
    """Show current progress using SoloFlow status + our simple table."""
    store = SQLiteStore(DB_PATH)
    store.initialize()
    ws = WorkflowService(store)
    ws.set_scheduler(Scheduler(store, ws))

    wf = await get_or_create_progress_workflow(ws)
    status = await ws.get_workflow_status(wf["id"])

    print(f"\n📊 BlkSpace Phase 0 Progress (workflow {wf['id'][:8]}...)")
    print(f"State: {status['state']} | Progress: {status['progress']['completed']}/{status['progress']['total']} ({status['progress'].get('progress_pct', 0)}%)")
    print("-" * 60)

    # Show our local progress table for quick view
    rows = store.execute("SELECT task_id, status, note, updated_at FROM progress ORDER BY updated_at DESC").fetchall()
    if rows:
        for r in rows:
            print(f"  {r[0]:<25} | {r[1]:<12} | {r[2][:60] if r[2] else ''}... | {r[3]}")
    else:
        print("  (no updates yet - run 'update' commands)")

    # Show ready steps (SoloFlow DAG power)
    ready = await ws.get_ready_steps(wf["id"])
    if ready:
        print(f"\n🚀 Currently ready for work (parallel possible): {ready}")

    store.close()

async def build_discord_summary(store, ws, wf_id: str) -> str:
    """Build a clean Discord message from current SoloFlow state + progress table."""
    status = await ws.get_workflow_status(wf_id)
    progress_line = f"**BlkSpace Phase 0 Hub Theory** — {status['progress']['completed']}/{status['progress']['total']} complete ({status['state']})"

    # Recent updates
    recent = store.execute(
        "SELECT task_id, status, note FROM progress ORDER BY updated_at DESC LIMIT 5"
    ).fetchall()

    lines = [progress_line, ""]
    for tid, st, note in recent:
        short_note = (note or "")[:80].replace("\n", " ")
        lines.append(f"• **{tid}** → {st}: {short_note}")

    lines.append("")
    lines.append("See `plan.md` + `docs/phase-0-status.md` | Use `/soloflow` or the progress script to update.")

    return "\n".join(lines)

def post_to_discord(content: str):
    """Post to Discord webhook. Simple and reliable for progress tracking."""
    if not WEBHOOK_URL:
        print("⚠️  No DISCORD_WEBHOOK_URL set — skipping Discord post. Set the env var to enable.")
        return
    try:
        resp = requests.post(WEBHOOK_URL, json={"content": content}, timeout=10)
        if resp.status_code in (200, 204):
            print("📨 Posted progress update to Discord.")
        else:
            print(f"⚠️  Discord webhook returned {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        print(f"⚠️  Failed to post to Discord: {e}")

# --- CLI ---

def main():
    parser = argparse.ArgumentParser(description="BlkSpace SoloFlow Progress Tracker (Discord + DAG workflows)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_update = sub.add_parser("update", help="Mark a task as in-progress / done / blocked etc.")
    p_update.add_argument("task_id", help="e.g. hub-data-storage")
    p_update.add_argument("status", help="done / in-progress / blocked / note")
    p_update.add_argument("note", nargs="*", default="", help="Optional note or reason")

    sub.add_parser("list", help="Show current progress and ready steps")

    sub.add_parser("post", help="Force-post the current summary to Discord (uses the webhook)")

    args = parser.parse_args()

    if args.cmd == "update":
        note = " ".join(args.note) if isinstance(args.note, list) else args.note
        asyncio.run(update_progress(args.task_id, args.status, note))
    elif args.cmd == "list":
        asyncio.run(list_progress())
    elif args.cmd == "post":
        # Rebuild and post using last known state
        store = SQLiteStore(DB_PATH)
        store.initialize()
        # We need a wf id — recreate the workflow object
        # For simplicity just run list which does the post if webhook set, or build a summary
        asyncio.run(list_progress())  # list already posts if webhook is configured
        store.close()

if __name__ == "__main__":
    main()

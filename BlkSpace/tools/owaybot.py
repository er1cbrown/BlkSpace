#!/usr/bin/env python3
"""
OWAYBOT - Discord Bot for BlkSpace on WeixNet solo dev progress tracking.

This is a lightweight Discord bot built to work alongside SoloFlow (in tools/SoloFlow).
It can post hello world, track progress using the existing blkspace_progress.py logic (SoloFlow DAG workflows + SQLite),
and later integrate with OpenClaw if you want agent-driven updates.

Name: OWAYBOT (as requested)

To run:
1. Create a Discord bot at https://discord.com/developers/applications
   - Add bot, copy the TOKEN.
   - Enable "Message Content Intent" under Bot settings.
   - Invite the bot to your server with "Send Messages", "Read Message History", "Embed Links" permissions.
2. Get your channel ID (right-click channel in Discord with Developer Mode on).
3. pip install discord.py python-dotenv  (in your venv)
4. Set env vars:
   DISCORD_BOT_TOKEN=your_token_here
   DISCORD_CHANNEL_ID=your_channel_id_here
   (Optional) DISCORD_WEBHOOK_URL for the progress script fallback
5. Run: python tools/owaybot.py

On startup it will send "Hello World from OWAYBOT!" to the channel.
Use !hello or /hello for commands.
Use !progress update <task_id> <status> <note...> to update via SoloFlow workflows (same as blkspace_progress.py).

This keeps things in SoloFlow without overloading the full OpenClaw stack for basic bot use.
For full agent power, run OpenClaw + install the SoloFlow skill.

Current tasks are from your plan.md Phase 0 (can be extended).
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv  # pip install python-dotenv

import discord
from discord.ext import commands

# Load .env if present (for local dev)
load_dotenv()

# Paths relative to this script (repo root is parent of tools/)
REPO_ROOT = Path(__file__).parent.parent
PROGRESS_SCRIPT = REPO_ROOT / "tools" / "blkspace_progress.py"
SOLOFLOW_CORE = REPO_ROOT / "tools" / "SoloFlow" / "hermes-plugin"

# Add SoloFlow core to path so we can import if needed for advanced workflows
if SOLOFLOW_CORE.exists():
    sys.path.insert(0, str(SOLOFLOW_CORE))

# Bot setup
intents = discord.Intents.default()
intents.message_content = True  # Required for commands and reading messages

bot = commands.Bot(
    command_prefix="!",
    intents=intents,
    help_command=commands.DefaultHelpCommand()
)

# Environment
TOKEN = os.getenv("DISCORD_BOT_TOKEN")
CHANNEL_ID = int(os.getenv("DISCORD_CHANNEL_ID", "0")) if os.getenv("DISCORD_CHANNEL_ID") else 0

if not TOKEN:
    print("ERROR: DISCORD_BOT_TOKEN not set. Set it in .env or environment.")
    sys.exit(1)

if not CHANNEL_ID:
    print("WARNING: DISCORD_CHANNEL_ID not set. Hello world will only work via commands or you can hardcode it.")

@bot.event
async def on_ready():
    print(f"OWAYBOT is online! Logged in as {bot.user} (ID: {bot.user.id})")
    print(f"Connected to {len(bot.guilds)} guild(s).")
    
    # Send Hello World on startup to the configured channel
    if CHANNEL_ID:
        channel = bot.get_channel(CHANNEL_ID)
        if channel:
            try:
                await channel.send("**Hello World from OWAYBOT!** 🚀\n\nReady to track BlkSpace on WeixNet progress using SoloFlow workflows.")
                print(f"Sent hello world to channel {CHANNEL_ID}")
            except Exception as e:
                print(f"Failed to send startup message: {e}")
        else:
            print(f"Channel {CHANNEL_ID} not found. Make sure the bot is in the server and has access.")
    else:
        print("No CHANNEL_ID set - skipping startup hello world. Use !hello in chat.")

@bot.command(name="hello")
async def hello(ctx):
    """Send a hello world message."""
    await ctx.send("**Hello World from OWAYBOT!** \n\n(Tracking BlkSpace dev progress via SoloFlow DAGs)")

@bot.command(name="progress")
async def progress(ctx, action: str = None, task_id: str = None, status: str = None, *, note: str = ""):
    """
    Update or list BlkSpace progress using SoloFlow.
    
    Examples:
    !progress list
    !progress update hub-data-storage done "Modeled Nostr + Iroh + SQLite"
    !progress update hub-node-harvest in-progress "Low-end nodes pinning CIDs"
    """
    if not action:
        await ctx.send("Usage: `!progress list` or `!progress update <task_id> <status> <note...>`")
        return
    
    action = action.lower()
    
    if action == "list":
        # Call the existing progress script for list
        try:
            result = await run_progress_script(["list"])
            await ctx.send(f"**OWAYBOT Progress Report:**\n```\n{result}\n```")
        except Exception as e:
            await ctx.send(f"Error running progress list: {e}")
    
    elif action == "update":
        if not task_id or not status:
            await ctx.send("Usage: `!progress update <task_id> <status> <optional note...>`\nExample: `!progress update hub-data-storage done \"modeled storage\"`")
            return
        
        try:
            args = ["update", task_id, status]
            if note:
                args.append(note)
            
            result = await run_progress_script(args)
            await ctx.send(f"**Progress updated via SoloFlow:**\n{result}")
        except Exception as e:
            await ctx.send(f"Error updating progress: {e}")
    
    else:
        await ctx.send(f"Unknown action '{action}'. Use `list` or `update`.")

async def run_progress_script(args):
    """Run the existing blkspace_progress.py script and return output."""
    if not PROGRESS_SCRIPT.exists():
        return "Progress script not found at tools/blkspace_progress.py"
    
    # Run as subprocess to keep it isolated (uses its own SoloFlow imports)
    import subprocess
    try:
        # Use the venv python if available, else system
        python_cmd = sys.executable
        venv_python = REPO_ROOT / ".venv" / "Scripts" / "python.exe"
        if venv_python.exists():
            python_cmd = str(venv_python)
        
        cmd = [python_cmd, str(PROGRESS_SCRIPT)] + args
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(REPO_ROOT),
            timeout=30
        )
        output = result.stdout.strip()
        if result.stderr:
            output += f"\n[stderr]\n{result.stderr.strip()}"
        return output or "No output from progress script."
    except Exception as e:
        return f"Failed to run progress script: {e}"

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CommandNotFound):
        await ctx.send("Unknown command. Try `!hello` or `!progress list`")
    else:
        await ctx.send(f"Error: {error}")

if __name__ == "__main__":
    print("Starting OWAYBOT...")
    print(f"Using progress script: {PROGRESS_SCRIPT}")
    print("Make sure your .env has DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID")
    bot.run(TOKEN)
# Grok in OpenCode in Neovim

Use **Grok as the model**, **OpenCode as the agent**, and **Neovim as the editor**.

You are not running the Grok Build TUI inside OpenCode. You connect Grok to OpenCode, then attach OpenCode to nvim.

Official xAI writeup: [Use Grok in OpenCode](https://x.ai/news/grok-opencode)

---

## 1. Install OpenCode

```bash
curl -fsSL https://opencode.ai/install | bash
```

Confirm the binary is on your `PATH`:

```bash
opencode --version
```

---

## 2. Connect Grok (xAI)

```bash
opencode
```

Inside OpenCode:

```
/connect
```

Pick **xAI**, then one of:

| Method | When to use |
| --- | --- |
| **xAI Grok OAuth (SuperGrok Subscription)** | Local machine; opens a browser. Uses SuperGrok / X Premium. |
| **xAI Grok OAuth (Headless / Remote / VPS)** | SSH or remote host; prints a code + URL. |
| **API key** | Set `XAI_API_KEY` and add xAI as a normal provider. |

Pick a model with `/models`. xAI models in OpenCode include Grok 4.6, Grok 4.5, and Grok Build 0.1 (names change over time).

---

## 3. Use that OpenCode from Neovim

OpenCode speaks ACP. The agent command is:

```bash
opencode acp
```

It uses the provider you already connected, so Grok comes along automatically.

### Option A — avante.nvim (ACP)

```lua
{
  acp_providers = {
    ["opencode"] = {
      command = "opencode",
      args = { "acp" },
    },
  },
}
```

Docs: [OpenCode ACP](https://opencode.ai/docs/acp/) · [avante.nvim](https://github.com/yetone/avante.nvim)

### Option B — CodeCompanion (ACP)

```lua
require("codecompanion").setup({
  interactions = {
    chat = {
      adapter = {
        name = "opencode",
        -- optional: pin a Grok model name from /models
        -- model = "grok-4.6",
      },
    },
  },
})
```

Docs: [codecompanion.nvim](https://github.com/olimorris/codecompanion.nvim)

### Option C — OpenCode-specific plugin

- [NickvanDyke/opencode.nvim](https://github.com/NickvanDyke/opencode.nvim) — spawn or connect to an OpenCode server; inject cursor / selection / buffer
- [sudo-tee/opencode.nvim](https://github.com/sudo-tee/opencode.nvim) — chat panel + workspace sessions

### Option D — no plugin

```vim
:terminal opencode
```

Or run OpenCode in a tmux pane next to nvim.

---

## 4. What you get vs the Grok CLI

| | Grok in OpenCode + nvim | `grok` / Grok Build TUI |
| --- | --- | --- |
| Model | Grok (incl. Grok Build) | Grok |
| Agent / tools | OpenCode’s tools, sessions, plugins | Grok’s tools, skills, MCP, worktrees |
| Editor | Neovim via ACP or a plugin | Grok TUI, or `grok agent stdio` |

Same model family, different agent.

If you want **Grok’s own tools** in nvim instead of OpenCode’s, skip OpenCode and use CodeCompanion or avante with:

```bash
grok agent --always-approve stdio
```

---

## Quick checklist

1. Install OpenCode
2. `opencode` → `/connect` → **xAI**
3. `/models` → pick a Grok model
4. Point nvim at `opencode acp` (avante / CodeCompanion) **or** use opencode.nvim **or** `:terminal opencode`

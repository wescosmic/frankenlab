# FrankenLab — Working with Kiro

How to run the build with the Kiro CLI, and why the CLI is the right primary
surface for the hackathon.

---

## 1. The decision

**Use the Kiro CLI as the primary surface. Keep the IDE for spec authoring and
anything visual.**

This is not a downgrade, and it is not a workaround. Three reasons:

1. **The competition asks you to explain how the surfaces differ.** The rules
   name IDE, CLI, Web and Crew, and they ask "how did they differ, if you tried
   multiple?" You cannot answer that with a difference you did not observe.
   The CLI is where the differences are most visible: it has headless mode and
   ACP, the IDE does not.
2. **The CLI is not a reduced IDE.** It is the same agent harness with the same
   `.kiro/` configuration. Steering, specs, hooks, custom agents, sub-agents,
   MCP, skills, powers, knowledge, code intelligence, permissions and
   workflows all work in the terminal. `.kiro/` is shared across every surface.
3. **A solo developer with 34 days wants one terminal.** No IDE window to
   manage, no context switch between editor and agent.

The honest write-up needs more than one surface, so use more than one. The
shape that falls out of the actual tooling:

| Surface | What it is genuinely good at in this build |
| ------- | ------------------------------------------ |
| IDE    | Authoring specs, the 3D scene, the inspector |
| CLI    | The build loop, parallel sub-agents, the scripted sweep |
| Crew   | Unattended overnight runs, schedules |
| Web    | A second machine, if you have one |

## 2. Install

**Windows (PowerShell):**

```powershell
irm 'https://cli.kiro.dev/install.ps1' | iex
```

Windows needs Windows 11 and Windows Terminal or PowerShell. Command Prompt
will not do.

**macOS (Homebrew):**

```bash
brew install kiro-cli
```

**macOS and Linux:**

```bash
curl -fsSL https://cli.kiro.dev/install | bash
```

Then sign in and check the install:

```powershell
kiro-cli login
kiro-cli doctor
```

The CLI auto-updates in the background. `kiro-cli update` updates it on demand
(`--non-interactive` to skip the prompt).

## 3. First launch in this repository

```powershell
cd C:\path\to\frankenlab
kiro-cli chat --v3
```

**Trust the workspace when prompted.** Until you do, Kiro does not load the
workspace's steering files, custom agents, MCP servers, skills or workflows,
and it asks before every shell command. Everything in `.kiro/` in this repo is
inert until the workspace is trusted. This is the single most common reason a
Kiro session "ignores" the project configuration.

Confirm it loaded:

```
/config
```

That lists the agents, steering files, skills and hooks in one place.

## 4. Models, and where MiniMax fits

```powershell
kiro-cli chat --list-models
kiro-cli chat --list-models --format json
```

Inside a session, `/model` opens the picker, which also has an **Effort** row
and a **Fallback** row. `/model set-current-as-default` persists your choice to
`~/.kiro/settings/cli.json`. `--model <id>` and `--effort <level>` set them at
launch. The effort levels are `low`, `medium`, `high`, `xhigh` and `max`,
depending on the model.

`/model edit` controls which models the picker lists. Hidden models stay
available through `/model <model-id>`, `--model`, agent configuration and
fallback settings, so you can keep the picker short without losing a model.

### MiniMax is already in Kiro

| Model           | Context | Credits | Status      | Tiers                     | Regions |
| --------------- | ------- | ------- | ----------- | ------------------------- | ------- |
| **MiniMax M2.5** | 200K    | 0.25x   | Active      | Free, Pro, Pro+, Pro Max, Power | US, EU |
| **MiniMax M2.1** | 200K    | 0.15x   | Experimental | Free and up               | US, EU |

For scale, Auto is 1.0x, Claude Sonnet 5.5 is 1.3x, Claude Opus 5.5 is 2.0x and
GPT-5.6 Sol is 4.4x. MiniMax M2.5 is described by Kiro as near-Opus quality at
a quarter of the cost, which makes it a sensible default for a 4,000-credit
build.

**MiniMax M3 was not in the catalogue as of the models page dated 24 October
2026.** The list is served live, so check `--list-models` on your own account
before assuming.

### What you cannot do

**You cannot plug your own MiniMax API key into Kiro.** There is no custom
provider, no base URL and no API host anywhere in the settings reference.
Authentication is Builder ID, IAM Identity Center, social login, or a
`KIRO_API_KEY` issued by Kiro itself, and inference runs on Kiro's own
endpoints. If you want a model other than the catalogue offers, it has to come
in through MCP or ACP, not through a provider setting.

## 5. The FrankenLab loop

Start straight in the orchestrator:

```powershell
kiro-cli chat --v3 --agent lab-lead
```

Inside a session:

```
/spec view frankenlab tasks      read the spec
/agent swap lab-lead             switch to the orchestrator
Shift+Tab                        plan mode: it plans before it acts
/goal ...                        an autonomous loop with a stated finish line
/agent swap kernel-guardian      or work with a specialist directly
Ctrl+G                           watch the sub-agents run
```

Switching agents keeps your current model selection, unless the target agent's
configuration names a model of its own. That is why the agent profiles in
`.kiro/agents/` deliberately do **not** pin a model: a pinned `model` field has
to match a live model ID, and a stale one makes the first prompt fail instead
of falling back.

Steering is automatic. The four files in `.kiro/steering/` are loaded into every
session.

### The agents in this repository

| Agent                 | Owns                                                       |
| --------------------- | ---------------------------------------------------------- |
| `lab-lead`            | Orchestrates, delegates, gates on `npm run verify`          |
| `kernel-guardian`     | `src/kernel/`, `src/interactions/`, `src/world.ts`          |
| `engine-builder`      | `src/engines/**` and engine tests                           |
| `science-reviewer`    | Read-only review of scientific honesty                      |
| `ui-integration`      | `src/app/`, `src/components/`, `src/state/`, `src/three/`   |

The lead can run the four specialists in parallel with isolated context. Their
tool access is deliberately narrow: the reviewer cannot write at all, and the
guardian is asked before it writes into an engine.

### The hooks in this repository

`/hooks` lists them. All four live in `.kiro/hooks/` and work in the IDE too.

| Hook                     | Trigger      | What it does                                          |
| ------------------------ | ------------ | ----------------------------------------------------- |
| `session-context`        | SessionStart | Prints branch, last commit, working tree, next tasks   |
| `lint-on-save`           | File Save    | `eslint --fix` on the saved TypeScript file            |
| `guard-destructive-shell`| Pre Tool Use | Blocks force push, hard reset, `git clean`, `rm -rf` of the repo |
| `verify-on-stop`         | Agent Stop   | Runs `npm run verify` and feeds the result back to the agent |

A hook command that exits 0 has its stdout added to the agent's context. A
command that exits non-zero sends its stderr to the agent as an error, and on
a Pre Tool Use trigger it **blocks the tool call**. The scripts behind these
hooks are in `scripts/hook-*.mjs`.

## 6. The scripted one-shot pass

This is the shape the competition write-up should describe: a scripted CLI pass
for the test sweep.

```powershell
kiro-cli chat --v3 --no-interactive --trust-workspace --trust-all-tools --output-format stream-json "Review the last commit for scientific honesty. Report any unit, confidence or conservation problem with file and line."
```

`--output-format stream-json` emits one JSON object per line, which is what
makes the output scriptable rather than something you have to scrape off a
terminal.

### The flags that matter

| Flag | What it does |
| ---- | ------------ |
| `--no-interactive` | Never expect input. Required by `stream-json`. |
| `--trust-workspace` | Skips the "Trust this workspace?" prompt for that launch. Hooks, agents, MCP servers and workflows from the folder load without asking. The decision is **not** saved. |
| `--trust-all-tools` | The model may run any tool without asking for confirmation. |
| `--trust-tools=fs_read,fs_write` | Trust only this set. V3 tool IDs are `fs_read`, `fs_write` and so on. |
| `--agent <name>` | Start with a specific agent profile. |
| `--mode spec` | Run the V3 agent in spec mode. |
| `--effort <level>` | `low`, `medium`, `high`, `xhigh` or `max`. |
| `--cloud --repo owner/name` | Run the session in a Kiro cloud sandbox against a repository. |

**Without `--trust-tools` or `--trust-all-tools`, a headless run cannot use any
tool that needs approval.** It fails with:

```
The permission request failed before it was answered, so this call did not run; the user did not reject it.
```

That message reads like a rejection, but nobody was there to answer. In an
interactive session the same call pauses for approval instead.

### The event stream

`stream-json` emits **ACP events**, one self-describing JSON object per line.
The event kinds seen in a real run:

| Event | Carries |
| ----- | ------- |
| `runStarted` | The ACP payload schema and engine version |
| `sessionUpdate` | Everything below |
| `runFinished` | The end of the run |

Inside `sessionUpdate`, the `update.sessionUpdate` field distinguishes:
`available_commands_update` (the agent roster, each with its origin),
`session_info_update` (hook events, steering inclusion, context usage, turn
completion), `tool_call` and `tool_call_update` (the tool traffic),
`agent_message_chunk` (the reply) and `agent_thought_chunk`.

Two of these are worth reading in a script:

```js
// The agent roster, with where each profile came from
for (const c of update.availableCommands ?? []) {
  console.log(c._meta.kiro.resource.source.origin, c.name); // workspace | bundled | user
}

// Hooks that actually fired
const hook = update._meta?.kiro?.hook;
if (hook) console.log(hook.name, hook.status, hook.actionType);
```

A `hook_update` with `status: "completed"` and `actionType: "runCommand"` is
proof that a hook ran, not just that a hook file exists.

### The same thing in CI

```yaml
- run: kiro-cli chat --v3 --no-interactive --trust-all-tools --output-format stream-json "Run the test suite and report failures"
  env:
    KIRO_API_KEY: ${{ secrets.KIRO_API_KEY }}
```

A `KIRO_API_KEY` is issued from the Kiro portal.

## 7. Connecting an outside agent to Kiro

If you want another agent, including MiniMax Code, driving Kiro directly,
there are two mechanisms. Neither needs a change to the model inside Kiro.

**Headless as a subprocess.** The simplest and most reliable wiring. Any
process on the machine can run:

```powershell
kiro-cli chat --v3 --no-interactive --output-format stream-json "<prompt>"
```

and read the JSON Lines result. An agent with shell access can call it as a
tool. This is also how a nightly review job runs.

**ACP.** `kiro-cli acp` speaks the Agent Client Protocol, the standard way an
editor or application drives the Kiro agent harness. This is the integration
point third-party editors use (Zed, JetBrains). Pick the harness with:

```powershell
kiro-cli settings acp.agentEngine v3
```

`v3` needs CLI 2.36 or later; `v2` is the default otherwise.

**A persistent server.** `kiro-cli serve` starts a WebSocket server for the
v3 engine, which is the third option: leave it running and connect to it
repeatedly instead of paying process start-up on every call.

## 8. Kiro Crew

```powershell
kiro-cli crew
```

Crew is a persistent local agent with a Gateway on `http://localhost:5476`, a
Task Runner that turns a description into a spec and runs it end to end,
schedules, and parallel sub-agents.

On Windows, Crew installs from a signed `.exe`. `kiro-cli crew --yes gateway`
installs it when needed and starts the Gateway. The standalone commands are
`kirocrew setup`, `kirocrew doctor` and `kirocrew gateway`.

Crew is the right home for the long unattended runs, and it is the surface
behind the Best Kiro Crew App prize.

## 9. Credits and the clock

| Deadline                                   | What                                     |
| ------------------------------------------ | ---------------------------------------- |
| **1 Dec 2026, 12:00 PM Pacific**           | Kiro credit request form. 48 business hours to review. |
| **4 Dec 2026**                             | Credits must be redeemed by this date.   |
| **31 Dec 2026**                            | Redeemed credits expire.                 |
| **4 Dec 2026, 2:00 PM Pacific**            | Submission.                              |

Request 4,000 credits. **Confirm with the organisers that CLI usage draws from
the same pool as the IDE** before you commit the whole build to one surface.

## 10. Gotchas

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Steering, agents, hooks and skills all ignored | Workspace not trusted | Trust it on first launch |
| `/spec` finds nothing | Wrong directory | `cd` into the repository root |
| A saved model is unavailable | The catalogue changed, or your tier differs | `/model` and pick another |
| The first prompt fails on an agent that pins a model | The `model` field must match a live model ID | Leave `model` unset, or check `--list-models` first |
| A hook does nothing | It must exit 0 to succeed | Our scripts exit 0 on success and non-zero to block |
| A hook cannot find `npm` | Hooks run in the project root with your PATH | Our hooks call `node scripts/...` directly |
| Windows quoting problems | Command Prompt is not supported | Use PowerShell or Windows Terminal |
| `kiro-cli` not found after install | PATH has not refreshed | Open a new terminal |

## 11. Keep notes for the write-up

The rules ask how the surfaces differed. Capture the differences as you go,
not afterwards:

```powershell
kiro-cli chat
/transcript save session-notes.md
```

Worth recording: what the IDE did that the CLI did not, what the CLI did that
the IDE did not, what a sub-agent in parallel saved you, and what the scripted
headless pass caught that you had not looked at.

# Kiro Crew — the property sweep task

This directory holds the Crew task that runs unattended, overnight, looking for
counterexamples to the simulation's invariants.

| File | What it is |
| ---- | ---------- |
| `property-sweep.md` | The task spec. Crew reads this, decomposes it into steps, runs each step and verifies each step against a command. |
| `README.md` | This file: how the task is configured and where it got to. |

## Configuration

```json
{
  "taskrunner": {
    "workspace_dir": "C:\\Users\\Wesley\\.minimax\\workspace\\frankenlab",
    "test_command": ["C:\\Program Files\\nodejs\\node.exe",
                     "node_modules/vitest/vitest.mjs", "run", "tests/properties"]
  },
  "hooks": {
    "auto_approve_tools": ["read", "Reading *", "fs_write", "Writing *", "shell", "Running: *"]
  }
}
```

The `test_command` is what makes a Crew run trustworthy. A step that completes
is not thereby verified. Crew runs the command after every step and records a
verdict of passed, failed, skipped or not configured, and the completion
summary counts only `passed` as verified.

## Where it got to

**The sweep has not run to completion yet.** Two Crew runs were attempted and
both failed:

1. The first failed on the account's monthly usage limit. The Crew agent ships
   pinned to the `auto` model, which had no allowance left. The CLI was on
   `minimax-m2.5`. Pinning the Crew agent to the same model fixed that.
2. The second failed on an MCP server timeout, because the embedding model was
   still being downloaded underneath the session. That session never started,
   which is why the `kirocrew-core` MCP server had nothing to answer.

The account's request quota is exhausted again, so the sweep is queued to run
when it resets on **1 December 2026**. Until it does, `docs/PROPERTY-SWEEP.md`
does not exist, and the everyday property tests in
`tests/properties/invariants.test.ts` are what defend the invariants.

The rule in the task spec is the one that matters for a scientific project: **a
failing property is a finding, not a bug in the test.** The agent is told not
to weaken a property and not to change product code to make one pass. It is
told to report the counterexample, shrunk to its smallest form.

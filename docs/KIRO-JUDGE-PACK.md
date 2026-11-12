# Kiro judge pack

This is the short evidence map for the Kiroween submission. The full narrative
is in [KIRO-WRITEUP.md](KIRO-WRITEUP.md); this file lets a judge verify the
important surfaces quickly.

## What Kiro changed

- The numbered spec in `.kiro/specs/frankenlab/` decomposed the project into
  kernel, engine, interaction, trust and delivery phases.
- Steering documents in `.kiro/steering/` keep architecture, engineering,
  product and scientific-integrity rules in every session.
- Custom agents in `.kiro/agents/` separate kernel, engine, science, UI and
  final-review responsibilities.
- Hooks in `.kiro/hooks/` inject session context, lint saved files, guard
  destructive commands and verify before a task stops.
- `.kiro/settings/mcp.json` records the MCP extension point used by the build.
- `.kiro/powers/frankenlab/` packages the project's confidence vocabulary and
  model-verification workflow.
- Property-based tests protect conservation, units, ranges and determinism.

## The concrete Kiro moment

The science reviewer checked the substrate parameters against published
references and found that the sand field-capacity value was too low. The
engine-builder applied the correction and re-measured the story. The visible
timeline moved to alert day 11, growth stall day 20 and wilting day 21. The
README, measurement scripts, tests and demo use the same values.

## The honest failure

A destructive-shell guard initially returned an exit code that warned instead
of blocking. Testing it against the real command exposed the mismatch. The hook
was corrected and the failure is documented because a reliable agent workflow
must be tested at the boundary it claims to protect.

## How to verify the product

1. Open the live app and follow the first-run guide.
2. Run Project BioCircuit and watch the alert change.
3. Open Couplings to inspect the named cross-discipline rule.
4. Open Experiments and switch to Catalysis Comparison.
5. Enter Judge mode for the uncluttered presentation view.
6. Run `npm run verify` from the public repository.

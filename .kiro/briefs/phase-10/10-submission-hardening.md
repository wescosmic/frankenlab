# Phase 10 - submission hardening

## Outcome

Make the existing FrankenLab experience obvious to a judge in under two
minutes, then produce evidence that the app and Kiro workflow are real.

## Product work

- Add a dismissible first-run guide for Project BioCircuit.
- Add a presentation/judge mode that centers the 3D bench and hides secondary
  panels without changing simulation behavior.
- Give every experiment a question, three-step path, watch signal and reason it
  matters; expose that story in the experiment picker and first-run guide.
- Verify every catalogue model resolves locally and no component silently falls
  back to an unrelated primitive.

## Kiro evidence work

- Review with `.kiro/agents/judge-reviewer.md` against the five judging criteria.
- Capture the Kiro science-review correction, the guard-hook correction, one
  spec-to-code task, one hook firing, and one property-based test in the write-up.
- Keep claims honest when work was completed outside Kiro after quota exhaustion.

## Verification

```text
npm run verify
npm run build
python scripts/check-devpost.py
```

Browser smoke test: load the live app, dismiss and restore the guide, open the
experiment picker, switch experiments, enter and exit Judge mode, run the
flagship, open Couplings, and verify the catalogue models render without a
console error.

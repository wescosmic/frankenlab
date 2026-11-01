# Task: Hunt for counterexamples in the FrankenLab invariants

FrankenLab is a scientific sandbox. Its physics claims are defended by
property-based tests written with fast-check in
`tests/properties/invariants.test.ts`. Those properties run with a small
number of random cases because they have to be fast. This task raises the
number of cases and widens the set of invariants, so that a hidden
counterexample has a chance to show itself.

## Steps

1. Read `tests/properties/invariants.test.ts` and `tests/observations.test.ts`
   to learn which invariants the project already defends, and how they are
   written.
2. Read `src/kernel/types.ts` and `src/kernel/simulator.ts` to learn what the
   simulation actually guarantees.
3. Write a new file `tests/properties/sweep-invariants.test.ts`. It must:
   - keep the invariants that already exist, but raise fast-check's `numRuns`
     to 2000 for each property;
   - add properties for invariants the project does not yet defend, taken
     from what the kernel guarantees. Good candidates: two runs with the same
     seed produce identical results; the simulated clock never goes backwards;
     every published quantity is finite; a finished run does not advance past
     its duration; no component publishes a reading outside the range its own
     definition allows.
4. Run the property tests. If a property fails, do not weaken it and do not
   delete it. Record the counterexample fast-check produced, shrunk to its
   smallest form.
5. Write `docs/PROPERTY-SWEEP.md`. It lists every property, what it defends,
   how many cases it ran, and the result. If a counterexample was found, it
   goes at the top of the report with the failing input and the reason it
   matters.
6. Leave the existing test files untouched. The new file is additive.

## Rules

- Do not change any file outside `tests/properties/sweep-invariants.test.ts`
  and `docs/PROPERTY-SWEEP.md`.
- Do not change the product code to make a property pass. A failing property
  is a finding, not a bug in the test.
- If the kernel genuinely breaks an invariant, report it. Do not paper over
  it.

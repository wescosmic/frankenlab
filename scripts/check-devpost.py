"""Check the Devpost copy before the submission is saved.

Three things go wrong quietly: a field goes over its character limit, a figure
in the story drifts away from the number the simulation actually produces, and
a stray em dash or smart quote ends up in text that has to paste cleanly.

Run it from the repository root:

    python scripts/check-devpost.py

Exit code 0 means the copy is safe to paste.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORY_FILE = ROOT / "docs" / "DEVPOST-STORY.md"
CHECKLIST_FILE = ROOT / "docs" / "DEVPOST.md"

# Devpost's own limit for the Project Story field. The form shows no counter,
# so this is the conservative number.
STORY_LIMIT = 5000
PITCH_LIMIT = 200
TAGLINE_LIMIT = 200

# The headings Devpost asks for, in order.
HEADINGS = [
    "Inspiration",
    "What it does",
    "How we built it",
    "Challenges we ran into",
    "Accomplishments that we're proud of",
    "What we learned",
    "What's next for FrankenLab",
]

# The figures the story states, and where each one is measured. A number that
# is not in this list is a number someone typed by hand.
MEASURED = {
    "0.12": "sand field capacity, materials/SUBSTRATE_PRESETS",
    "0.17 to 0.25": "published range, the science review",
    "day 8": "before the science review",
    "day 16": "before the science review",
    "day 11": "alert, BIOCIRCUIT_MEASURED_DAYS",
    "day 20": "growth stalls, BIOCIRCUIT_MEASURED_DAYS",
    "day 21": "medium wilts, BIOCIRCUIT_MEASURED_DAYS",
    "0.609569": "uncatalysed product, scripts/measure-catalysis.ts",
    "0.609612": "solved equilibrium, scripts/measure-catalysis.ts",
    "182": "npm run verify",
    "fifteen": "npm run verify",
}


def untagged_blocks(text: str) -> list[str]:
    """Every fenced block with no language tag, which is how the copy is set."""
    return [
        match.group(1)
        for match in re.finditer(r"```\n(.*?)\n```", text, re.S)
        if match.group(1).strip()
    ]


def main() -> int:
    problems: list[str] = []

    if not STORY_FILE.exists():
        print(f"missing {STORY_FILE}")
        return 1
    story = STORY_FILE.read_text(encoding="utf-8").rstrip("\n")

    length = len(story)
    print(f"project story : {length} characters, {len(story.split())} words")
    if length > STORY_LIMIT:
        problems.append(f"project story is {length}, over {STORY_LIMIT}")

    found = re.findall(r"^## (.+)$", story, re.M)
    if found != HEADINGS:
        problems.append(f"headings are {found}, expected {HEADINGS}")
    else:
        print(f"headings      : all {len(found)} Devpost headings, in order")

    # Every stated figure must be one the project measured.
    for figure in sorted(MEASURED):
        if figure not in story:
            problems.append(f"the story no longer mentions {figure}")

    # The story must not pick up characters that break a clean paste.
    for bad, name in (("\u2014", "em dash"), ("\u2018", "smart quote")):
        count = story.count(bad)
        if count:
            problems.append(f"the story contains {count} {name}(s)")

    if not CHECKLIST_FILE.exists():
        print(f"missing {CHECKLIST_FILE}")
        return 1
    checklist = CHECKLIST_FILE.read_text(encoding="utf-8")
    blocks = untagged_blocks(checklist)
    if len(blocks) >= 2:
        tagline, pitch = blocks[0], blocks[1]
        print(f"tagline       : {len(tagline)} characters")
        print(f"pitch         : {len(pitch)} characters")
        if len(tagline) > TAGLINE_LIMIT:
            problems.append(f"tagline is {len(tagline)}, over {TAGLINE_LIMIT}")
        if len(pitch) > PITCH_LIMIT:
            problems.append(f"pitch is {len(pitch)}, over {PITCH_LIMIT}")
    else:
        problems.append("could not find the tagline and pitch blocks")

    if problems:
        print()
        for problem in problems:
            print(f"PROBLEM: {problem}")
        return 1

    print("\nthe Devpost copy is within limits and every figure is measured")
    return 0


if __name__ == "__main__":
    sys.exit(main())

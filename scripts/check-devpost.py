"""Validate the current Devpost story and copy-paste package.

Run from the repository root: python scripts/check-devpost.py
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORY = ROOT / "docs" / "DEVPOST-STORY.md"
SUBMISSION = ROOT / "docs" / "DEVPOST-SUBMISSION-UPDATED.md"
HEADINGS = [
    "Inspiration",
    "What it does",
    "How we built it",
    "Challenges we ran into",
    "Accomplishments that we're proud of",
    "What we learned",
    "What's next for FrankenLab",
]


def main() -> int:
    story = STORY.read_text(encoding="utf-8").strip()
    package = SUBMISSION.read_text(encoding="utf-8")
    problems: list[str] = []

    print(f"project story: {len(story)} / 5000 characters")
    if len(story) > 5000:
        problems.append("project story exceeds Devpost's 5000-character limit")

    headings = re.findall(r"^### (.+)$", story, re.M)
    if headings != HEADINGS:
        problems.append(f"unexpected story headings: {headings}")

    match = re.search(
        r"^## About the project\s*\n(.*?)^## Built with\s*$",
        package,
        re.M | re.S,
    )
    if not match or match.group(1).strip() != story:
        problems.append("the first story in the submission package differs from DEVPOST-STORY.md")

    for label, limit in (("Tagline", 200), ("Short pitch", 200)):
        match = re.search(rf"^## {label}\s*\n\s*```text\s*\n(.*?)\n```", package, re.M | re.S)
        if not match:
            problems.append(f"missing {label.lower()}")
        else:
            value = match.group(1)
            print(f"{label.lower()}: {len(value)} / {limit} characters")
            if len(value) > limit:
                problems.append(f"{label.lower()} exceeds {limit} characters")

    for obsolete in ("We did not use Kiro IDE", "Web was evaluated", "Kiro IDE supported"):
        if obsolete in story or obsolete in package:
            problems.append(f"outdated submission wording: {obsolete}")

    for problem in problems:
        print(f"PROBLEM: {problem}")
    if problems:
        return 1
    print("Devpost copy is consistent and within field limits")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Print the character count of each section of the Devpost story.

Run it from the repository root:

    python scripts/story-weight.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORY = ROOT / "docs" / "DEVPOST-STORY.md"


def main() -> int:
    if not STORY.exists():
        print(f"missing {STORY}")
        return 1

    text = STORY.read_text(encoding="utf-8").rstrip("\n")
    total = len(text)
    print(f"total {total} characters\n")

    parts = re.split(r"^## ", text, flags=re.M)
    overhead = len(parts[0])
    for part in parts[1:]:
        heading, _, body = part.partition("\n")
        print(f"  {len(part):>5}  {heading}")

    print(f"\n  {overhead:>5}  (preamble)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

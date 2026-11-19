"""Mix the generated ducked music bed into the submission cut without re-rendering video."""

import json
import re
import subprocess
import tempfile
from html import unescape
from pathlib import Path

import numpy as np
import soundfile as sf


ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "docs/demo/submission-cut-v7"
SOURCE = PROJECT / "frankenlab-submission-v9.mp4"
OUTPUT = PROJECT / "frankenlab-submission-v10.mp4"
MUSIC = PROJECT / "assets/frankenlab-ambient.wav"
COMPOSITION = PROJECT / "index.html"
FFMPEG = "ffmpeg"


def run(*args: str) -> None:
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", *args], check=True)


def main() -> None:
    match = re.search(r'<audio id="music-bed"[^>]*data-automation="([^"]+)"', COMPOSITION.read_text(encoding="utf-8"))
    if not match:
        raise SystemExit("No music automation found in the HyperFrames composition")
    automation = json.loads(unescape(match.group(1)))
    points = automation["lanes"][0]["points"]
    x = np.array([point["t"] for point in points], dtype=np.float64)
    y = np.array([point["v"] for point in points], dtype=np.float64)

    with tempfile.TemporaryDirectory(prefix="frankenlab-mix-") as temp:
        voice_path = Path(temp) / "voice.wav"
        stem_path = Path(temp) / "ducked-music.wav"
        run("-y", "-i", str(SOURCE), "-map", "0:a:0", "-ac", "2", "-ar", "48000", str(voice_path))
        voice, rate = sf.read(voice_path, dtype="float32", always_2d=True)
        music, music_rate = sf.read(MUSIC, dtype="float32", always_2d=True)
        if rate != music_rate:
            raise SystemExit(f"Voice/music sample rate mismatch: {rate} vs {music_rate}")
        frames = len(voice)
        times = np.arange(frames, dtype=np.float64) / rate
        envelope = np.interp(times, x, y)
        # Match the editable HyperFrames clip's 2 second edge fades.
        fade_in = np.clip(times / 2.0, 0, 1)
        fade_out = np.clip((frames / rate - times) / 2.0, 0, 1)
        envelope *= np.minimum(fade_in, fade_out)
        music = music[:frames] * (0.16 * envelope[:, None]).astype(np.float32)
        sf.write(stem_path, music, rate, subtype="PCM_16")
        run(
            "-y", "-i", str(SOURCE), "-i", str(stem_path),
            "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",
            "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-t", "122", "-movflags", "+faststart", str(OUTPUT),
        )
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()

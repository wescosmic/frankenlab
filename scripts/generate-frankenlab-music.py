"""Generate FrankenLab's original, local, royalty-free ambient score."""

import math
import wave
from pathlib import Path

import numpy as np


OUT = Path(__file__).resolve().parents[1] / "docs/demo/submission-cut-v7/assets/frankenlab-ambient.wav"
RATE = 48_000
DURATION = 122
TOTAL = RATE * DURATION


def midi(hz: float) -> float:
    return 440.0 * 2 ** ((hz - 69) / 12)


def smooth(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    t = np.arange(TOTAL, dtype=np.float64) / RATE
    left = np.zeros(TOTAL, dtype=np.float64)
    right = np.zeros(TOTAL, dtype=np.float64)

    # A warm, gently curious progression: Fmaj9, Cadd9/E, Am7, Gsus2.
    chords = [([53, 57, 60, 64, 67], 41), ([52, 55, 60, 62, 67], 40),
              ([45, 52, 55, 60, 64], 45), ([43, 50, 53, 57, 62], 43)]
    block = 16.0
    for i, (notes, bass_note) in enumerate(chords * 2):
        start = i * block
        end = min(DURATION, start + block)
        idx0, idx1 = int(start * RATE), min(TOTAL, int(end * RATE))
        if idx1 <= idx0:
            continue
        tt = t[idx0:idx1]
        local = tt - start
        # Short crossfades make each change feel like one continuous score.
        fade_in = smooth(local / 1.5)
        fade_out = 1 - smooth((local - (end - start - 1.5)) / 1.5)
        env = np.minimum(fade_in, fade_out)
        for j, note in enumerate(notes):
            f = midi(note)
            wobble = 0.16 * np.sin(2 * np.pi * (0.07 + j * 0.009) * tt + j)
            phase = 2 * np.pi * f * tt + wobble
            tone = np.sin(phase) + 0.21 * np.sin(2 * phase + 0.15) + 0.065 * np.sin(3 * phase)
            tone *= 0.022 / (1 + j * 0.15) * env
            pan = 0.22 + j * 0.14
            left[idx0:idx1] += tone * math.cos(pan * math.pi / 2)
            right[idx0:idx1] += tone * math.sin(pan * math.pi / 2)

        # Soft low foundation, only the root and a fifth, with no percussive hit.
        bf = midi(bass_note)
        bass = (np.sin(2 * np.pi * bf * tt) + .13 * np.sin(4 * np.pi * bf * tt)) * .032 * env
        left[idx0:idx1] += bass * .76
        right[idx0:idx1] += bass * .76

    # Quiet, bell-like notes trace chord tones at an unhurried pace.
    scale = [65, 69, 72, 76, 79, 84, 81, 76, 72, 79, 76, 72]
    beat = 1.5
    for k, start in enumerate(np.arange(0.8, DURATION - 1, beat)):
        # Leave breathing room at regular intervals; the voice remains dominant.
        if k % 7 == 5:
            continue
        note = scale[(k + (k // 11) * 3) % len(scale)]
        f = midi(note)
        i0, i1 = int(start * RATE), min(TOTAL, int((start + 2.4) * RATE))
        tt = np.arange(i1 - i0, dtype=np.float64) / RATE
        attack = smooth(tt / 0.055)
        env = attack * np.exp(-tt * 2.0)
        bell = (np.sin(2 * np.pi * f * tt) + .24 * np.sin(2 * np.pi * f * 2.01 * tt)) * .018 * env
        pan = .2 + .6 * ((k * .37) % 1)
        left[i0:i1] += bell * math.cos(pan * math.pi / 2)
        right[i0:i1] += bell * math.sin(pan * math.pi / 2)

    # Subtle stereo air and gentle fades at the film edges.
    air = (np.sin(2 * np.pi * 0.11 * t) + .4 * np.sin(2 * np.pi * 0.17 * t + .7)) * .002
    left += air
    right -= air
    edge = np.minimum(smooth(t / 2.0), 1 - smooth((t - (DURATION - 2.0)) / 2.0))
    stereo = np.column_stack((left * edge, right * edge))
    peak = np.max(np.abs(stereo))
    stereo = np.clip(stereo * (0.82 / max(peak, 1e-9)), -0.95, 0.95)
    pcm = (stereo * 32767).astype("<i2")
    with wave.open(str(OUT), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(pcm.tobytes())
    print(f"Wrote {OUT} ({DURATION}s, {RATE}Hz stereo, peak {np.max(np.abs(stereo)):.3f})")


if __name__ == "__main__":
    main()

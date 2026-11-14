# FrankenLab submission cut

`frankenlab-submission-cut.mp4` is the 2:22, 1920×1080 submission video.

It keeps the existing product walkthrough and adds:

- an opening hook and closing card;
- voiceover mixed with the original product audio at a low bed level;
- highlighted captions with teal, blue, and orange proof-point emphasis;
- an explicit Kiro science-review beat in the final twelve seconds.

The HyperFrames source composition is in `submission-cut-v2/`. The final encode
was produced from the same checked composition design with FFmpeg because this
machine's low-memory HyperFrames renderer is limited to roughly one to two
frames per second for this long 1080p capture.

## Files

- `frankenlab-submission-cut.mp4` — upload this to YouTube/Devpost.
- `submission-cut-v2/index.html` — editable HyperFrames composition.
- `submission-highlighted.ass` — editable highlighted-caption source.
- `submission-voiceover.txt` — narration script.
- `submission-voiceover-final.wav` — generated narration source.

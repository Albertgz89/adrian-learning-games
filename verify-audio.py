'''verify-audio.py — machine verification for every generated voice clip.
Transcribes each art/audio/*.m4a with faster-whisper (base.en) and compares
against voice_expect.json (file -> expected text, plus homophone aliases).
A clip ships ONLY when whisper hears exactly the intended words or a listed
alias. Run: <whisper venv python> verify-audio.py   (pip install faster-whisper)
Writes clip_report.json next to this script; exits 1 if any clip is flagged.
'''
import os, json, re, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.join(DIR, "art/audio")
spec = json.load(open(os.path.join(DIR, "voice_expect.json")))
EXPECT, ALIASES = spec["expect"], spec["aliases"]

from faster_whisper import WhisperModel
model = WhisperModel("base.en", device="cpu", compute_type="int8")

def norm(t):
    t = re.sub(r"[^a-z0-9 ]", "", t.lower())
    return re.sub(r"\s+", " ", t).strip()

report = []
files = sorted(f for f in os.listdir(AUD) if f.endswith('.m4a'))
for f in files:
    path = os.path.join(AUD, f)
    try:
        out = subprocess.run(['afinfo', path], capture_output=True, text=True).stdout
        dur = float(re.search(r"estimated duration: ([\d.]+)", out).group(1))
    except Exception:
        dur = -1
    segs, info = model.transcribe(path, language="en", beam_size=5)
    heard = norm(" ".join(s.text for s in segs))
    want_raw = EXPECT.get(f, "")
    want = norm(want_raw)
    ok_aliases = [norm(a) for a in ALIASES.get(want_raw.lower().strip(), []) + ALIASES.get(want, [])]
    status = "OK" if (heard == want or heard in ok_aliases) else "DIFF"
    if f not in EXPECT: status = "UNEXPECTED-FILE"
    if dur < 0.2 or dur > 8: status = "BAD-DURATION"
    if not heard: status = "SILENT/UNRECOGNIZED"
    report.append((status, f, f"{dur:.2f}s", repr(want), repr(heard)))

bad = [r for r in report if r[0] != "OK"]
print(f"checked {len(report)} clips — {len(report)-len(bad)} verified, {len(bad)} flagged:")
for r in bad: print("  " + " | ".join(r))
json.dump([{"status": r[0], "file": r[1], "dur": r[2], "want": r[3], "heard": r[4]} for r in report],
          open(os.path.join(DIR, "clip_report.json"), "w"), indent=1)
sys.exit(1 if bad else 0)

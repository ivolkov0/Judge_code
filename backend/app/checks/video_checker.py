"""Video/screencast checker.

Validates: duration (3–5 min), resolution (≥720p), codec.
Optionally runs Whisper transcription if the library is installed.
Falls back gracefully when whisper / ffprobe is absent.
"""
import json
import os
import re
import subprocess
import tempfile
from collections import Counter

MIN_DURATION = 180   # 3 min
MAX_DURATION = 300   # 5 min
MIN_HEIGHT   = 720

# Common Russian stop-words to ignore when ranking sentences for the summary.
_STOP_WORDS = set(
    "и в во не на я с со что а то все она так его но да ты к у же вы за бы по "
    "только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг "
    "ли если уже или ни быть был него до вас для мы тебя их чем была сам чтоб без "
    "это как этот того потому этого какой совсем здесь этом один при два об другой "
    "более всегда есть надо них про всего там потом над больше тот через эти нас".split()
)


def summarize(text: str, max_sentences: int = 3) -> str:
    """Extractive summary: rank sentences by significant-word frequency and
    return the top ones in their original order. Pure-Python, no ML deps —
    works on any transcript regardless of how it was produced."""
    text = (text or "").strip()
    if not text:
        return ""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?…])\s+", text) if s.strip()]
    if len(sentences) <= max_sentences:
        return " ".join(sentences)[:400]
    words = re.findall(r"\w+", text.lower())
    freq = Counter(w for w in words if w not in _STOP_WORDS and len(w) > 2)
    if not freq:
        return " ".join(sentences[:max_sentences])[:400]

    def score(sentence: str) -> float:
        ws = [w for w in re.findall(r"\w+", sentence.lower()) if w in freq]
        return sum(freq[w] for w in ws) / (len(ws) + 1)

    ranked = sorted(range(len(sentences)), key=lambda i: score(sentences[i]), reverse=True)
    top = sorted(ranked[:max_sentences])
    return " ".join(sentences[i] for i in top)[:400]


try:
    import whisper as _whisper
    _WHISPER_MODEL = _whisper.load_model("tiny")
    HAS_WHISPER = True
except Exception:
    HAS_WHISPER = False


def check_video(file_path: str) -> dict:
    # ── ffprobe metadata ──────────────────────────────────────────────────────
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_streams", "-show_format", file_path],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        data = json.loads(result.stdout)
    except FileNotFoundError:
        return {"passed": False, "score": 0.0,
                "details": {"error": "ffprobe not found — install ffmpeg"}}
    except Exception as exc:
        return {"passed": False, "score": 0.0, "details": {"error": str(exc)}}

    duration = float(data.get("format", {}).get("duration", 0))
    video_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "video"), None
    )
    audio_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None
    )
    width  = video_stream.get("width", 0)  if video_stream else 0
    height = video_stream.get("height", 0) if video_stream else 0
    codec  = video_stream.get("codec_name", "unknown") if video_stream else "unknown"
    has_audio = audio_stream is not None

    # ── Scoring ───────────────────────────────────────────────────────────────
    score = 0.0
    if MIN_DURATION <= duration <= MAX_DURATION:
        score += 5
    elif duration > 0:
        score += 2
    if height >= MIN_HEIGHT:
        score += 3
    if codec in ("h264", "h265", "hevc", "vp9", "av1"):
        score += 2
    score = min(score, 10.0)
    passed = (MIN_DURATION <= duration <= MAX_DURATION) and (height >= MIN_HEIGHT)

    details: dict = {
        "duration_sec": round(duration, 1),
        "width": width,
        "height": height,
        "codec": codec,
        "has_audio": has_audio,
        "min_duration": MIN_DURATION,
        "max_duration": MAX_DURATION,
    }

    # ── Whisper transcription (optional) ─────────────────────────────────────
    transcript = None
    summary = None
    if HAS_WHISPER and has_audio:
        try:
            transcript, summary = _transcribe(file_path, duration)
            details["transcript"] = transcript
            details["summary"] = summary
        except Exception as exc:
            details["transcription_error"] = str(exc)
    elif has_audio:
        # ffmpeg-only: extract audio info without transcription
        details["transcription_note"] = (
            "Install openai-whisper for automatic transcription."
        )

    return {
        "passed": passed,
        "score": round(score, 1),
        "details": details,
        "transcript": transcript,
        "summary": summary,
    }


def _transcribe(video_path: str, duration: float) -> tuple[str, str]:
    """Extract audio with ffmpeg, transcribe with whisper tiny model.

    Returns (full_transcript, short_summary).
    """
    # For long videos only transcribe first 5 minutes
    max_sec = min(duration, 300)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        audio_path = tmp.name

    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path,
             "-t", str(int(max_sec)),
             "-ar", "16000", "-ac", "1",
             "-f", "wav", audio_path],
            capture_output=True, timeout=120,
        )

        result = _WHISPER_MODEL.transcribe(audio_path, language="ru", fp16=False)
        text: str = result.get("text", "").strip()
        return text, summarize(text)
    finally:
        try:
            os.unlink(audio_path)
        except Exception:
            pass

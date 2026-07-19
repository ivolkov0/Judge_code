"""Documentation checker.

Validates required sections, minimum length, and presence of images/diagrams.
Supports PDF, DOCX, Markdown.

Scoring (max 15):
  sections   — up to 9  (required sections present)
  length     — up to 3  (≥100 words, full credit at ≥500)
  images     — up to 3  (diagrams / screenshots embedded)
"""
import os
import re
import zipfile


def _norm(s: str) -> str:
    """Normalise for keyword matching: lowercase + fold ё→е so that, e.g.,
    a document heading «Развёртывание» matches the keyword «развертывание»."""
    return s.lower().replace("ё", "е")


# Fallback used when the organizer has not configured any checklist items.
# Each entry is (canonical_key, [synonyms searched in text], human label).
# The canonical key is what ends up in found_sections/missing_sections and is
# what the frontend matches against — keep it in sync with the UI labels.
DEFAULT_SECTIONS = [
    ("описание", ["описание", "обзор", "введение", "о системе", "назначение"],
     "Описание работы системы"),
    ("развертывание", ["развертывание", "установка", "деплой", "развёртывание"],
     "Инструкция по развёртыванию"),
    ("эксплуатация", ["эксплуатация", "использование", "руководство пользователя",
                      "работа с системой"], "Инструкция по эксплуатации"),
]


def _normalize_sections(sections: list) -> list:
    """Accept both the built-in 3-tuples (key, [synonyms], label) and the
    organizer's 2-tuples (keyword, label); return uniform 3-tuples."""
    out = []
    for item in sections:
        if len(item) == 3:
            key, synonyms, label = item
        else:  # organizer checklist: a single keyword string
            key, label = item
            synonyms = [key]
        out.append((key, list(synonyms), label))
    return out


def _extract_pdf(path: str) -> tuple[str, int]:
    """Return (text, image_count)."""
    text, images = "", 0
    try:
        import PyPDF2
        parts = []
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                parts.append(page.extract_text() or "")
                # Count embedded images via XObject resources
                try:
                    res = page.get("/Resources")
                    if res and "/XObject" in res:
                        xobjects = res["/XObject"].get_object()
                        for obj in xobjects.values():
                            if obj.get_object().get("/Subtype") == "/Image":
                                images += 1
                except Exception:
                    pass
        text = "\n".join(parts)
    except Exception:
        pass
    return text, images


def _extract_docx(path: str) -> tuple[str, int]:
    text, images = "", 0
    try:
        from docx import Document
        doc = Document(path)
        text = "\n".join(p.text for p in doc.paragraphs)
        # Images are stored under word/media/ in the docx (zip) container
        try:
            with zipfile.ZipFile(path) as z:
                images = sum(1 for n in z.namelist() if n.startswith("word/media/"))
        except Exception:
            pass
    except Exception:
        pass
    return text, images


def _extract_md(path: str) -> tuple[str, int]:
    text, images = "", 0
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            text = f.read()
        # Markdown image syntax ![alt](src) and inline <img>
        images = len(re.findall(r"!\[[^\]]*\]\([^)]+\)", text))
        images += len(re.findall(r"<img\s", text, re.IGNORECASE))
    except Exception:
        pass
    return text, images


def check_doc(file_path: str, sections: list | None = None) -> dict:
    """`sections` is a list of (keyword, label) pairs from the organizer's
    checklist; falls back to DEFAULT_SECTIONS when not provided."""
    sections = _normalize_sections(sections or DEFAULT_SECTIONS)
    ext = os.path.splitext(file_path)[-1].lower()
    if ext == ".pdf":
        text, image_count = _extract_pdf(file_path)
    elif ext == ".docx":
        text, image_count = _extract_docx(file_path)
    else:
        text, image_count = _extract_md(file_path)

    text_norm = _norm(text)
    word_count = len(text.split())

    # found/missing carry the canonical *key* (not the label): the seed data and
    # the frontend both match on the key. A section counts as found when ANY of
    # its synonyms appears in the normalised text.
    found, missing = [], []
    for key, synonyms, _label in sections:
        if any(_norm(s) in text_norm for s in synonyms):
            found.append(key)
        else:
            missing.append(key)
    total_sections = len(sections) or 1

    # ── Scoring ──────────────────────────────────────────────────────────────
    section_score = (len(found) / total_sections) * 9                # max 9

    if word_count >= 500:
        length_score = 3.0
    elif word_count >= 100:
        length_score = 3.0 * (word_count - 100) / 400 + 1.0           # 1..3
    else:
        length_score = max(0.0, word_count / 100)                     # 0..1

    if image_count >= 3:
        image_score = 3.0
    elif image_count >= 1:
        image_score = 1.5
    else:
        image_score = 0.0

    score = min(section_score + length_score + image_score, 15.0)
    passed = len(missing) == 0 and word_count >= 100

    return {
        "passed": passed,
        "score": round(score, 1),
        "details": {
            "word_count": word_count,
            "found_sections": found,
            "missing_sections": missing,
            "image_count": image_count,
            "has_images": image_count > 0,
            "file_type": ext,
        },
    }

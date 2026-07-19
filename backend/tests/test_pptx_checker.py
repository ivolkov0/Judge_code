"""Presentation checker: slide count + required topics."""
import pytest

pptx = pytest.importorskip("pptx")  # python-pptx is a project dependency


def _build(tmp_path, slide_texts):
    prs = pptx.Presentation()
    blank = prs.slide_layouts[6]
    for txt in slide_texts:
        slide = prs.slides.add_slide(blank)
        box = slide.shapes.add_textbox(0, 0, prs.slide_width, prs.slide_height)
        box.text_frame.text = txt
    path = tmp_path / "deck.pptx"
    prs.save(str(path))
    return str(path)


def test_topics_and_slides(tmp_path):
    from app.checks.pptx_checker import check_presentation
    topics = ["проблема", "решение", "аудитория", "стек", "демо", "команда", "контакты", "итог"]
    path = _build(tmp_path, topics)
    r = check_presentation(path)
    assert r["details"]["slide_count"] == 8
    assert {"проблема", "решение", "команда", "контакты"}.issubset(set(r["details"]["found_topics"]))
    assert r["passed"] is True  # >=8 slides and >=3 topics


def test_too_few_slides_not_passed(tmp_path):
    from app.checks.pptx_checker import check_presentation
    path = _build(tmp_path, ["проблема", "решение"])
    r = check_presentation(path)
    assert r["details"]["slide_count"] == 2
    assert r["passed"] is False

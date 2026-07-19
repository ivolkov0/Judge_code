"""Documentation checker: synonyms, ё/е normalisation, length, images, scoring."""
from app.checks.doc_checker import check_doc, _norm


def _write(tmp_path, text):
    p = tmp_path / "doc.md"
    p.write_text(text, encoding="utf-8")
    return str(p)


def test_norm_folds_yo_and_case():
    assert _norm("Развёртывание") == "развертывание"


def test_sections_found_via_synonyms_and_yo(tmp_path):
    # «Обзор» is a synonym of описание; «Развёртывание» has ё; «Эксплуатация» direct.
    text = "## 1. Обзор\n" + ("слово " * 600) + "\n## 9. Развёртывание\n## 10. Эксплуатация\n"
    r = check_doc(_write(tmp_path, text))
    assert set(r["details"]["found_sections"]) == {"описание", "развертывание", "эксплуатация"}
    assert r["details"]["missing_sections"] == []
    assert r["passed"] is True
    assert r["score"] >= 12  # 9 sections + 3 length


def test_missing_sections_fail(tmp_path):
    r = check_doc(_write(tmp_path, "## Обзор\n" + ("x " * 200)))
    assert "развертывание" in r["details"]["missing_sections"]
    assert r["passed"] is False


def test_image_count_and_full_score(tmp_path):
    body = ("## Обзор\n## Развёртывание\n## Эксплуатация\n" + ("текст " * 600)
            + "\n![d](a.png)\n![d](b.png)\n<img src='c.png'>\n")
    r = check_doc(_write(tmp_path, body))
    assert r["details"]["image_count"] >= 3
    assert r["score"] == 15.0  # 9 + 3 + 3

"""Extractive screencast summary — pure-Python, no ML deps required."""
from app.checks.video_checker import summarize


def test_empty():
    assert summarize("") == ""
    assert summarize("   ") == ""


def test_short_text_returned_whole():
    assert summarize("Привет. Это демо.") == "Привет. Это демо."


def test_picks_key_sentences_in_order():
    text = (
        "Наш сервис автоматически проверяет решения команд на хакатоне. "
        "Сегодня хорошая погода. "
        "Сервис анализирует код, документацию, презентацию и скринкаст. "
        "Кот спит на диване. "
        "Жюри получает готовый отчёт и итоговый рейтинг команд."
    )
    s = summarize(text, max_sentences=3)
    assert s
    assert len(s) <= 400
    # The signal-heavy sentences (about the сервис/жюри) should dominate.
    assert "сервис" in s.lower() or "жюри" in s.lower()
    # Irrelevant filler should be dropped.
    assert "Кот спит" not in s


def test_respects_max_sentences():
    text = " ".join(f"Предложение номер {i} про систему оценки." for i in range(10))
    s = summarize(text, max_sentences=2)
    assert s.count(".") <= 2

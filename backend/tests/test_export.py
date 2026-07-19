"""CSV export: organizer-only, UTF-8 BOM, ';' delimiter, Russian headers."""


def test_export_forbidden_for_participant(client, make_user, auth_headers):
    make_user("exp_part@test.ru", role="participant")
    assert client.get("/api/analytics/export", headers=auth_headers("exp_part@test.ru")).status_code == 403


def test_export_csv_shape(client, make_user, auth_headers):
    make_user("exp_org@test.ru", role="organizer")
    r = client.get("/api/analytics/export", headers=auth_headers("exp_org@test.ru"))
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    assert "judge_results_" in r.headers.get("content-disposition", "")

    text = r.content.decode("utf-8-sig")  # decode strips the BOM if present
    assert r.content.startswith(b"\xef\xbb\xbf")          # UTF-8 BOM for Excel
    header = text.splitlines()[0]
    assert header.split(";")[:3] == ["Место", "Команда", "Кейс"]   # ';' delimiter + RU headers
    assert "Авто-балл" in header and "Итог" in header

"""Seed demo data. Safe to run multiple times — skips existing records."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, engine, Base
from app import models
from app.auth import hash_password
from app.migrate import run_migrations

Base.metadata.create_all(bind=engine)
# Seed runs before the app's own startup migration, so it must migrate itself:
# add any columns missing on an already-existing DB *before* querying the tables.
run_migrations(engine)

db = SessionLocal()

def utcnow():
    return datetime.now(timezone.utc)


# ── Cases ──────────────────────────────────────────────────────────────────
CASES = [
    {"slug": "fintech", "title": "Финтех: Автоматизация скоринга", "sponsor": "Сбер",
     "description": "ML-алгоритм для оценки кредитоспособности малого бизнеса."},
    {"slug": "edtech", "title": "EdTech: ИИ для проверки ДЗ", "sponsor": "Яндекс",
     "description": "Система автоматической проверки открытых ответов студентов."},
    {"slug": "medtech", "title": "MedTech: Анализ снимков МРТ", "sponsor": "Минздрав",
     "description": "Нейросеть для сегментации патологий на МРТ снимках."},
    {"slug": "gamedev", "title": "Gamedev: Мультиплеерный движок", "sponsor": "VK Play",
     "description": "Сетевая синхронизация 100+ игроков с минимальной задержкой."},
]
cases = {}
for c in CASES:
    obj = db.query(models.Case).filter_by(slug=c["slug"]).first()
    if not obj:
        obj = models.Case(**c)
        db.add(obj)
        db.flush()
    cases[c["slug"]] = obj
db.commit()

# ── Evaluation criteria ──────────────────────────────────────────────────────
CRITERIA = [
    {"name": "Техническая реализация", "weight": 3.0, "max_score": 10, "position": 0,
     "description": "Качество кода, архитектура, работоспособность решения."},
    {"name": "Инновационность", "weight": 2.0, "max_score": 10, "position": 1,
     "description": "Оригинальность идеи и подхода."},
    {"name": "Дизайн и UX", "weight": 2.0, "max_score": 10, "position": 2,
     "description": "Удобство и аккуратность интерфейса."},
    {"name": "Презентация", "weight": 1.5, "max_score": 10, "position": 3,
     "description": "Качество защиты и демонстрации."},
    {"name": "Бизнес-потенциал", "weight": 1.5, "max_score": 10, "position": 4,
     "description": "Применимость и перспективы продукта."},
]
criteria = []
for c in CRITERIA:
    obj = db.query(models.Criterion).filter_by(name=c["name"]).first()
    if not obj:
        obj = models.Criterion(**c)
        db.add(obj)
        db.flush()
    criteria.append(obj)
db.commit()


# ── Checklist items (configurable required sections) ─────────────────────────
CHECKLIST = [
    # Documentation sections (kind="docs")
    {"kind": "docs", "keyword": "описание", "label": "Описание работы системы", "position": 0},
    {"kind": "docs", "keyword": "развертывание", "label": "Инструкция по развёртыванию", "position": 1},
    {"kind": "docs", "keyword": "эксплуатация", "label": "Инструкция по эксплуатации", "position": 2},
    # Presentation topics (kind="presentation")
    {"kind": "presentation", "keyword": "проблема", "label": "Проблема", "position": 0},
    {"kind": "presentation", "keyword": "решение", "label": "Решение", "position": 1},
    {"kind": "presentation", "keyword": "аудитория", "label": "Целевая аудитория", "position": 2},
    {"kind": "presentation", "keyword": "стек", "label": "Технологический стек", "position": 3},
    {"kind": "presentation", "keyword": "демо", "label": "Демо", "position": 4},
    {"kind": "presentation", "keyword": "команда", "label": "Команда", "position": 5},
    {"kind": "presentation", "keyword": "контакты", "label": "Контакты", "position": 6},
]
for item in CHECKLIST:
    exists = db.query(models.ChecklistItem).filter_by(kind=item["kind"], keyword=item["keyword"]).first()
    if not exists:
        db.add(models.ChecklistItem(**item))
db.commit()


# ── Users ──────────────────────────────────────────────────────────────────
USERS = [
    {"email": "organizer@judge.ru", "password": "password", "first_name": "Алексей", "last_name": "Орлов", "role": "organizer"},
    {"email": "jury1@judge.ru",     "password": "password", "first_name": "Мария",   "last_name": "Иванова", "role": "jury"},
    {"email": "jury2@judge.ru",     "password": "password", "first_name": "Дмитрий", "last_name": "Смирнов", "role": "jury"},
    {"email": "participant@judge.ru","password": "password", "first_name": "Иван",    "last_name": "Петров",  "role": "participant"},
    {"email": "alice@judge.ru",      "password": "password", "first_name": "Алиса",  "last_name": "Козлова", "role": "participant"},
    {"email": "bob@judge.ru",        "password": "password", "first_name": "Борис",  "last_name": "Новиков", "role": "participant"},
    {"email": "carol@judge.ru",      "password": "password", "first_name": "Карина", "last_name": "Соколова","role": "participant"},
    {"email": "dan@judge.ru",        "password": "password", "first_name": "Данила", "last_name": "Морозов", "role": "participant"},
    {"email": "eva@judge.ru",        "password": "password", "first_name": "Ева",    "last_name": "Волкова", "role": "participant"},
    {"email": "frank@judge.ru",      "password": "password", "first_name": "Фёдор",  "last_name": "Лебедев", "role": "participant"},
    {"email": "grace@judge.ru",      "password": "password", "first_name": "Галина", "last_name": "Козлов",  "role": "participant"},
]
users = {}
for u in USERS:
    obj = db.query(models.User).filter_by(email=u["email"]).first()
    if not obj:
        obj = models.User(
            email=u["email"],
            password_hash=hash_password(u["password"]),
            first_name=u["first_name"],
            last_name=u["last_name"],
            role=u["role"],
        )
        db.add(obj)
        db.flush()
    users[u["email"]] = obj
db.commit()

# ── Teams ──────────────────────────────────────────────────────────────────
TEAMS = [
    {
        "name": "CodeSamurais", "case_slug": "fintech", "join_code": "SAM001",
        "leader": "participant@judge.ru",
        "members": ["alice@judge.ru", "bob@judge.ru"],
        "repo_url": "https://github.com/octocat/Hello-World",
        "checks": [
            {"check_type": "code", "status": "passed", "score": 15.0,
             "details": {"checks": {"has_readme": True, "has_license": True, "has_dependency_file": True, "dependency_file": "package.json"}}},
            {"check_type": "docs", "status": "passed", "score": 15.0,
             "details": {"word_count": 850, "found_sections": ["описание", "развертывание", "эксплуатация"], "missing_sections": []}},
            {"check_type": "presentation", "status": "passed", "score": 9.0,
             "details": {"slide_count": 12, "found_topics": ["проблема", "решение", "команда"], "missing_topics": []}},
            {"check_type": "screencast", "status": "passed", "score": 10.0,
             "details": {"duration_sec": 240, "width": 1920, "height": 1080, "codec": "h264"}},
        ],
        "jury_scores": [{"jury": "jury1@judge.ru", "score": 42}, {"jury": "jury2@judge.ru", "score": 45}],
    },
    {
        "name": "DevWizards", "case_slug": "edtech", "join_code": "DEV002",
        "leader": "carol@judge.ru",
        "members": ["dan@judge.ru"],
        "repo_url": "https://github.com/octocat/Spoon-Knife",
        "checks": [
            {"check_type": "code", "status": "passed", "score": 12.0,
             "details": {"checks": {"has_readme": True, "has_license": False, "has_dependency_file": True, "dependency_file": "requirements.txt"}}},
            {"check_type": "docs", "status": "passed", "score": 10.0,
             "details": {"word_count": 450, "found_sections": ["описание", "развертывание"], "missing_sections": ["эксплуатация"]}},
            {"check_type": "presentation", "status": "passed", "score": 8.0,
             "details": {"slide_count": 10, "found_topics": ["проблема", "решение"], "missing_topics": ["команда"]}},
            {"check_type": "screencast", "status": "passed", "score": 10.0,
             "details": {"duration_sec": 265, "width": 1920, "height": 1080, "codec": "h264"}},
        ],
        "jury_scores": [{"jury": "jury1@judge.ru", "score": 38}, {"jury": "jury2@judge.ru", "score": 40}],
    },
    {
        "name": "ByteMe", "case_slug": "medtech", "join_code": "BYT003",
        "leader": "eva@judge.ru",
        "members": ["frank@judge.ru"],
        "repo_url": "https://github.com/octocat/Hello-World",
        "checks": [
            {"check_type": "code", "status": "passed", "score": 15.0,
             "details": {"checks": {"has_readme": True, "has_license": True, "has_dependency_file": True}}},
            {"check_type": "docs", "status": "failed", "score": 5.0,
             "details": {"word_count": 120, "found_sections": ["описание"], "missing_sections": ["развертывание", "эксплуатация"]}},
            {"check_type": "presentation", "status": "passed", "score": 7.0,
             "details": {"slide_count": 9, "found_topics": ["проблема", "решение"], "missing_topics": ["команда"]}},
            {"check_type": "screencast", "status": "failed", "score": 2.0,
             "details": {"duration_sec": 90, "width": 1280, "height": 720, "codec": "h264"}},
        ],
        "jury_scores": [{"jury": "jury1@judge.ru", "score": 35}],
    },
    {
        "name": "NullPointers", "case_slug": "gamedev", "join_code": "NUL004",
        "leader": "grace@judge.ru",
        "members": [],
        "repo_url": None,
        "checks": [],
        "jury_scores": [],
    },
]

for t_data in TEAMS:
    team = db.query(models.Team).filter_by(name=t_data["name"]).first()
    if not team:
        case = cases[t_data["case_slug"]]
        team = models.Team(name=t_data["name"], case_id=case.id, join_code=t_data["join_code"])
        db.add(team)
        db.flush()

        leader = users[t_data["leader"]]
        if not db.query(models.TeamMember).filter_by(team_id=team.id, user_id=leader.id).first():
            db.add(models.TeamMember(team_id=team.id, user_id=leader.id, is_leader=True))

        for member_email in t_data["members"]:
            member = users[member_email]
            if not db.query(models.TeamMember).filter_by(team_id=team.id, user_id=member.id).first():
                db.add(models.TeamMember(team_id=team.id, user_id=member.id, is_leader=False))

        db.flush()

        submission = models.Submission(team_id=team.id, repo_url=t_data["repo_url"])
        db.add(submission)
        db.flush()

        base_time = utcnow() - timedelta(hours=2)
        for i, ch in enumerate(t_data["checks"]):
            check = models.CheckResult(
                submission_id=submission.id,
                check_type=ch["check_type"],
                status=ch["status"],
                score=ch["score"],
                details=ch["details"],
                checked_at=base_time + timedelta(minutes=i * 5),
            )
            db.add(check)

        for ev_data in t_data["jury_scores"]:
            jury_user = users[ev_data["jury"]]
            if not db.query(models.Evaluation).filter_by(team_id=team.id, jury_id=jury_user.id).first():
                ev = models.Evaluation(
                    team_id=team.id,
                    jury_id=jury_user.id,
                    score=ev_data["score"],
                    comment="Хорошая работа, есть потенциал для улучшения.",
                )
                db.add(ev)
                db.flush()
                # Distribute the flat score across criteria so the demo shows
                # per-criterion scoring (score/50 * max reproduces the same total).
                frac = ev_data["score"] / 50.0
                for crit in criteria:
                    db.add(models.CriterionScore(
                        evaluation_id=ev.id,
                        criterion_id=crit.id,
                        score=round(frac * crit.max_score),
                    ))

db.commit()

# ── Algorithmic problems ─────────────────────────────────────────────────────
ALGO_PROBLEMS = [
    {
        "title": "Сумма двух чисел",
        "statement": "## Условие\n\nДаны два целых числа A и B. Выведите их сумму.\n\n"
                     "## Входные данные\nОдна строка с двумя числами A и B (−10⁹ ≤ A, B ≤ 10⁹).\n\n"
                     "## Выходные данные\nОдно число — сумма A + B.",
        "time_limit_ms": 1000, "memory_limit_mb": 64,
        "tests": [
            {"input": "3 5", "output": "8", "sample": True},
            {"input": "-2 7", "output": "5", "sample": True},
            {"input": "1000000000 1000000000", "output": "2000000000", "sample": False},
            {"input": "0 0", "output": "0", "sample": False},
            {"input": "-1000000000 -1000000000", "output": "-2000000000", "sample": False},
        ],
    },
    {
        "title": "Сумма массива",
        "statement": "## Условие\n\nДан массив из N целых чисел. Найдите их сумму.\n\n"
                     "## Входные данные\nПервая строка: N (1 ≤ N ≤ 10⁵).\n"
                     "Вторая строка: N чисел, каждое по модулю не превышает 10⁴.\n\n"
                     "## Выходные данные\nСумма всех элементов массива.",
        "time_limit_ms": 2000, "memory_limit_mb": 128,
        "tests": [
            {"input": "5\n1 2 3 4 5", "output": "15", "sample": True},
            {"input": "3\n-1 -2 -3", "output": "-6", "sample": True},
            {"input": "1\n42", "output": "42", "sample": False},
            {"input": "4\n10000 10000 10000 10000", "output": "40000", "sample": False},
        ],
    },
    {
        "title": "Факториал",
        "statement": "## Условие\n\nВычислите N! (факториал числа N) по модулю 10⁹+7.\n\n"
                     "## Входные данные\nОдно число N (0 ≤ N ≤ 10⁶).\n\n"
                     "## Выходные данные\nN! mod (10⁹+7).",
        "time_limit_ms": 2000, "memory_limit_mb": 128,
        "tests": [
            {"input": "0", "output": "1", "sample": True},
            {"input": "5", "output": "120", "sample": True},
            {"input": "10", "output": "3628800", "sample": False},
            {"input": "20", "output": "146326063", "sample": False},
        ],
    },
]

organizer_user = users["organizer@judge.ru"]
for p_data in ALGO_PROBLEMS:
    prob = db.query(models.AlgoProblem).filter_by(title=p_data["title"]).first()
    if not prob:
        prob = models.AlgoProblem(
            title=p_data["title"],
            statement=p_data["statement"],
            time_limit_ms=p_data["time_limit_ms"],
            memory_limit_mb=p_data["memory_limit_mb"],
            created_by_id=organizer_user.id,
        )
        db.add(prob)
        db.flush()
        for t in p_data["tests"]:
            db.add(models.AlgoTestCase(
                problem_id=prob.id,
                input_data=t["input"],
                expected_output=t["output"],
                is_sample=t["sample"],
            ))

db.commit()
db.close()
print("Demo data seeded successfully")
print("  organizer@judge.ru / password")
print("  jury1@judge.ru     / password")
print("  jury2@judge.ru     / password")
print("  participant@judge.ru / password  (team: CodeSamurais)")

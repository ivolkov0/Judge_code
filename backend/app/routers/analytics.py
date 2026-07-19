"""Analytics & export for organizers / jury."""
import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import require_role
from ..database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

CHECK_TYPES = ["code", "docs", "presentation", "screencast"]
CHECK_LABELS_RU = {
    "code": "Код", "docs": "Документация",
    "presentation": "Презентация", "screencast": "Скринкаст",
}


def _ru_num(x) -> str:
    """Format a number with a comma decimal separator so Russian-locale Excel
    treats it as a number (used together with the ';' delimiter)."""
    if x is None or x == "":
        return ""
    return f"{round(float(x), 1):.1f}".replace(".", ",")


def _is_submitted(sub) -> bool:
    if not sub:
        return False
    return bool(
        sub.repo_url or sub.archive_path or sub.docs_path
        or sub.presentation_path or sub.screencast_path or sub.screencast_url
    )


def _auto_score(team: models.Team) -> float:
    if not team.submission:
        return 0.0
    return sum(c.score for c in team.submission.checks if c.status in ("passed", "failed"))


def _jury_score(team: models.Team) -> float:
    if not team.evaluations:
        return 0.0
    return sum(e.score for e in team.evaluations) / len(team.evaluations)


def _load_teams(db: Session):
    return (
        db.query(models.Team)
        .options(
            joinedload(models.Team.case),
            joinedload(models.Team.members),
            joinedload(models.Team.submission).joinedload(models.Submission.checks),
            joinedload(models.Team.evaluations),
        )
        .all()
    )


@router.get("/overview", response_model=schemas.AnalyticsOverview)
def overview(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer", "jury")),
):
    teams = _load_teams(db)
    total_participants = db.query(models.User).filter(models.User.role == "participant").count()
    total_evaluations = db.query(models.Evaluation).count()

    totals = []
    autos = []
    juries = []
    submitted = 0
    teams_evaluated = 0

    for t in teams:
        a = _auto_score(t)
        j = _jury_score(t) if t.evaluations else 0.0
        autos.append(a)
        if t.evaluations:
            juries.append(j)
            teams_evaluated += 1
        totals.append(a + j)
        if t.submission and (t.submission.repo_url or t.submission.docs_path
                             or t.submission.presentation_path or t.submission.screencast_path
                             or t.submission.archive_path):
            submitted += 1

    def avg(xs):
        return round(sum(xs) / len(xs), 1) if xs else 0.0

    # Score distribution by total (buckets of 20, range 0–100)
    buckets = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 1e9)]
    labels = ["0–20", "20–40", "40–60", "60–80", "80+"]
    dist = []
    for (lo, hi), label in zip(buckets, labels):
        dist.append(schemas.Bucket(label=label, count=sum(1 for x in totals if lo <= x < hi)))

    # Pass rates per check type
    pass_rates = []
    for ct in CHECK_TYPES:
        checks = [c for t in teams if t.submission for c in t.submission.checks if c.check_type == ct]
        passed = sum(1 for c in checks if c.status == "passed")
        failed = sum(1 for c in checks if c.status == "failed")
        pending = sum(1 for c in checks if c.status in ("pending", "running"))
        scored = [c.score for c in checks if c.status in ("passed", "failed")]
        pass_rates.append(schemas.CheckPassRate(
            check_type=ct, passed=passed, failed=failed, pending=pending,
            avg_score=round(sum(scored) / len(scored), 1) if scored else 0.0,
        ))

    # Per-case breakdown
    case_map: dict = {}
    for t in teams:
        key = t.case.title if t.case else "Без кейса"
        case_map.setdefault(key, []).append(_auto_score(t) + (_jury_score(t) if t.evaluations else 0.0))
    case_breakdown = [
        schemas.CaseBreakdown(case=k, teams=len(v), avg_total=round(sum(v) / len(v), 1) if v else 0.0)
        for k, v in sorted(case_map.items())
    ]

    return schemas.AnalyticsOverview(
        total_teams=len(teams),
        total_participants=total_participants,
        submitted_teams=submitted,
        total_evaluations=total_evaluations,
        teams_evaluated=teams_evaluated,
        avg_auto=avg(autos),
        avg_jury=avg(juries),
        avg_total=avg(totals),
        score_distribution=dist,
        check_pass_rates=pass_rates,
        case_breakdown=case_breakdown,
    )


@router.get("/notifications")
def notifications(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("organizer", "jury")),
):
    """Recent activity feed derived from check results and evaluations."""
    items = []

    recent_checks = (
        db.query(models.CheckResult)
        .filter(models.CheckResult.checked_at.isnot(None))
        .order_by(models.CheckResult.checked_at.desc())
        .limit(15)
        .all()
    )
    ct_label = {"code": "Код", "docs": "Документация",
                "presentation": "Презентация", "screencast": "Скринкаст"}
    for c in recent_checks:
        sub = db.query(models.Submission).filter_by(id=c.submission_id).first()
        team = db.query(models.Team).filter_by(id=sub.team_id).first() if sub else None
        team_name = team.name if team else "Команда"
        items.append({
            "type": "check",
            "status": c.status,
            "title": f"{ct_label.get(c.check_type, c.check_type)}: {team_name}",
            "detail": "Проверка пройдена" if c.status == "passed" else "Проверка не пройдена",
            "score": c.score,
            "at": c.checked_at.isoformat() if c.checked_at else None,
        })

    recent_evals = (
        db.query(models.Evaluation)
        .options(joinedload(models.Evaluation.jury), joinedload(models.Evaluation.team))
        .order_by(models.Evaluation.created_at.desc())
        .limit(10)
        .all()
    )
    for e in recent_evals:
        items.append({
            "type": "evaluation",
            "status": "passed",
            "title": f"Оценка: {e.team.name if e.team else 'команда'}",
            "detail": f"{e.jury.first_name} {e.jury.last_name} поставил {e.score}/50",
            "score": e.score,
            "at": e.created_at.isoformat() if e.created_at else None,
        })

    items.sort(key=lambda x: x["at"] or "", reverse=True)
    return items[:20]


@router.get("/export")
def export_csv(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    """Download the full results table as a Russian-Excel-friendly CSV.

    Format choices that make it "just open" cleanly:
      • UTF-8 BOM            → Excel renders Cyrillic correctly
      • ';' delimiter         → matches the Russian Excel list separator
      • comma decimals        → numbers are recognised as numbers, not text

    Columns: place, team, case/sponsor, captain + contacts, roster, status,
    per-check auto scores, the auto total, a column per jury criterion (panel
    average), jury totals and the grand total.
    """
    teams = (
        db.query(models.Team)
        .options(
            joinedload(models.Team.case),
            joinedload(models.Team.members).joinedload(models.TeamMember.user),
            joinedload(models.Team.submission).joinedload(models.Submission.checks),
            joinedload(models.Team.evaluations).joinedload(models.Evaluation.criterion_scores),
        )
        .all()
    )
    criteria = (
        db.query(models.Criterion)
        .order_by(models.Criterion.position, models.Criterion.id)
        .all()
    )

    records = []
    for t in teams:
        checks = {c.check_type: c.score for c in (t.submission.checks if t.submission else [])}
        leader = next((m for m in t.members if m.is_leader and m.user), None)
        roster = "; ".join(
            f"{m.user.first_name} {m.user.last_name}" for m in t.members if m.user
        )
        crit_avg = {}
        for crit in criteria:
            vals = [cs.score for ev in t.evaluations for cs in ev.criterion_scores
                    if cs.criterion_id == crit.id]
            crit_avg[crit.id] = (sum(vals) / len(vals)) if vals else None
        auto = _auto_score(t)
        jury = _jury_score(t) if t.evaluations else 0.0
        records.append({
            "team": t,
            "checks": checks,
            "leader": leader,
            "roster": roster,
            "crit_avg": crit_avg,
            "auto": auto,
            "jury": jury,
            "total": auto + jury,
        })

    records.sort(key=lambda r: r["total"], reverse=True)

    buf = io.StringIO()
    buf.write("﻿")  # BOM so Excel detects UTF-8
    writer = csv.writer(buf, delimiter=";", lineterminator="\r\n")

    header = [
        "Место", "Команда", "Кейс", "Спонсор", "Капитан", "Email капитана",
        "Участников", "Состав", "Статус",
        *(CHECK_LABELS_RU[ct] for ct in CHECK_TYPES), "Авто-балл",
        *(f"Ж: {c.name}" for c in criteria),
        "Оценок жюри", "Жюри-балл", "Итог",
    ]
    writer.writerow(header)

    for rank, r in enumerate(records, 1):
        t = r["team"]
        leader = r["leader"]
        writer.writerow([
            rank,
            t.name,
            t.case.title if t.case else "",
            t.case.sponsor if t.case else "",
            f"{leader.user.first_name} {leader.user.last_name}" if leader else "",
            leader.user.email if leader else "",
            len(t.members),
            r["roster"],
            "Сдано" if _is_submitted(t.submission) else "В работе",
            *(_ru_num(r["checks"].get(ct)) for ct in CHECK_TYPES),
            _ru_num(r["auto"]),
            *(_ru_num(r["crit_avg"][c.id]) for c in criteria),
            len(t.evaluations),
            _ru_num(r["jury"]),
            _ru_num(r["total"]),
        ])

    # Footer with generation metadata.
    writer.writerow([])
    writer.writerow(["Команд всего", len(records)])
    writer.writerow(["Сформировано", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")])

    fname = f"judge_results_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )

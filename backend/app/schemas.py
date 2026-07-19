from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    avatar_path: Optional[str] = None
    # Extended profile
    phone: Optional[str] = None
    city: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    education: Optional[str] = None
    work: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    github: Optional[str] = None
    telegram: Optional[str] = None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    """All fields optional — only provided ones are updated."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    education: Optional[str] = None
    work: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    github: Optional[str] = None
    telegram: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "participant"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    token: str
    user: UserOut


class CaseOut(BaseModel):
    id: int
    slug: str
    title: str
    description: Optional[str]
    sponsor: Optional[str]

    model_config = {"from_attributes": True}


class MemberOut(BaseModel):
    user_id: int
    is_leader: bool
    user: UserOut

    model_config = {"from_attributes": True}


class TeamOut(BaseModel):
    id: int
    name: str
    join_code: str
    case: Optional[CaseOut]
    members: List[MemberOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamListItem(BaseModel):
    id: int
    name: str
    case: Optional[CaseOut]
    members_count: int
    status: str
    auto_score: float
    jury_score: Optional[float]
    # Whether the *current* jury member has already evaluated this team.
    # None for the organizer team list (no single "current jury" there).
    my_evaluated: Optional[bool] = None

    model_config = {"from_attributes": True}


class CreateTeamIn(BaseModel):
    name: str
    case_slug: Optional[str] = None


class JoinTeamIn(BaseModel):
    join_code: str


class SubmissionOut(BaseModel):
    id: int
    team_id: int
    repo_url: Optional[str]
    archive_filename: Optional[str]
    docs_filename: Optional[str]
    presentation_filename: Optional[str]
    screencast_filename: Optional[str]
    screencast_url: Optional[str]
    transcript: Optional[str]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class SetRepoIn(BaseModel):
    repo_url: str


class CheckResultOut(BaseModel):
    id: int
    check_type: str
    status: str
    score: float
    details: Optional[Any]
    checked_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CriterionIn(BaseModel):
    name: str
    description: Optional[str] = None
    weight: float = 1.0
    max_score: int = 10
    position: int = 0


class CriterionOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    weight: float
    max_score: int
    position: int

    model_config = {"from_attributes": True}


class CriterionScoreIn(BaseModel):
    criterion_id: int
    score: float


class CriterionScoreOut(BaseModel):
    criterion_id: int
    score: float

    model_config = {"from_attributes": True}


class EvaluationIn(BaseModel):
    # Either provide per-criterion scores (preferred) or a single overall score.
    criterion_scores: Optional[List[CriterionScoreIn]] = None
    score: Optional[float] = None
    comment: Optional[str] = None


class EvaluationOut(BaseModel):
    id: int
    team_id: int
    jury_id: int
    score: float
    comment: Optional[str]
    created_at: datetime
    jury: UserOut
    criterion_scores: List[CriterionScoreOut] = []

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank: int
    team_id: int
    team_name: str
    case_title: Optional[str]
    members_count: int
    auto_score: float
    jury_score: float
    total: float


class CaseIn(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    sponsor: Optional[str] = None


class TeamFullOut(BaseModel):
    """Aggregated team view for jury / organizer review."""
    team: TeamOut
    submission: Optional[SubmissionOut]
    checks: List[CheckResultOut] = []
    evaluations: List[EvaluationOut] = []
    auto_score: float
    jury_score: Optional[float]


# ── Checklist (configurable required sections) ────────────────────────────────

class ChecklistItemIn(BaseModel):
    kind: str  # docs | presentation
    keyword: str
    label: str
    position: int = 0


class ChecklistItemOut(BaseModel):
    id: int
    kind: str
    keyword: str
    label: str
    position: int

    model_config = {"from_attributes": True}


# ── Analytics ───────────────────────────────────────────────────────────────

class Bucket(BaseModel):
    label: str
    count: int


class CheckPassRate(BaseModel):
    check_type: str
    passed: int
    failed: int
    pending: int
    avg_score: float


class CaseBreakdown(BaseModel):
    case: str
    teams: int
    avg_total: float


class AnalyticsOverview(BaseModel):
    total_teams: int
    total_participants: int
    submitted_teams: int
    total_evaluations: int
    teams_evaluated: int
    avg_auto: float
    avg_jury: float
    avg_total: float
    score_distribution: List[Bucket]
    check_pass_rates: List[CheckPassRate]
    case_breakdown: List[CaseBreakdown]


# ── Algorithmic judge ──────────────────────────────────────────────────────────

class AlgoTestCaseIn(BaseModel):
    input_data: str
    expected_output: str
    is_sample: bool = False


class AlgoTestCaseOut(BaseModel):
    id: int
    input_data: str
    expected_output: str
    is_sample: bool

    model_config = {"from_attributes": True}


class AlgoProblemIn(BaseModel):
    title: str
    statement: str
    time_limit_ms: int = 2000
    memory_limit_mb: int = 256


class AlgoProblemOut(BaseModel):
    id: int
    title: str
    statement: str
    time_limit_ms: int
    memory_limit_mb: int
    created_at: datetime
    test_cases: List[AlgoTestCaseOut] = []

    model_config = {"from_attributes": True}


class AlgoProblemListItem(BaseModel):
    id: int
    title: str
    time_limit_ms: int
    memory_limit_mb: int
    created_at: datetime
    test_count: int
    my_best_verdict: Optional[str] = None

    model_config = {"from_attributes": True}


class AlgoSubmitIn(BaseModel):
    language: str  # python | cpp | java
    source_code: str


class AlgoSubmissionOut(BaseModel):
    id: int
    problem_id: int
    user_id: int
    language: str
    source_code: str
    verdict: str
    score: float
    time_ms: Optional[int]
    memory_mb: Optional[float]
    error_message: Optional[str]
    test_results: Optional[Any]
    submitted_at: datetime

    model_config = {"from_attributes": True}

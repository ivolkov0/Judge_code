import random
import string
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


def make_join_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    avatar_path = Column(String, nullable=True)
    role = Column(String, nullable=False, default="participant")  # participant | jury | organizer
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # ── Extended profile (optional, edited by the user) ──────────────────────
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    bio = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    work = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True)       # list[str]
    interests = Column(JSON, nullable=True)    # list[str]
    github = Column(String, nullable=True)
    telegram = Column(String, nullable=True)

    memberships = relationship("TeamMember", back_populates="user")
    evaluations = relationship("Evaluation", back_populates="jury")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    sponsor = Column(String)

    teams = relationship("Team", back_populates="case")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    join_code = Column(String, unique=True, nullable=False, default=make_join_code)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    case = relationship("Case", back_populates="teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    submission = relationship("Submission", back_populates="team", uselist=False)
    evaluations = relationship("Evaluation", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    team_id = Column(Integer, ForeignKey("teams.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    is_leader = Column(Boolean, default=False)

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, nullable=False)
    repo_url = Column(String, nullable=True)
    docs_path = Column(String, nullable=True)
    docs_filename = Column(String, nullable=True)
    presentation_path = Column(String, nullable=True)
    presentation_filename = Column(String, nullable=True)
    screencast_path = Column(String, nullable=True)
    screencast_filename = Column(String, nullable=True)
    screencast_url = Column(String, nullable=True)       # link to YouTube/Vimeo
    archive_path = Column(String, nullable=True)         # uploaded .zip
    archive_filename = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)             # auto-transcription of screencast
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    team = relationship("Team", back_populates="submission")
    checks = relationship("CheckResult", back_populates="submission", cascade="all, delete-orphan")


class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    check_type = Column(String, nullable=False)  # code | docs | presentation | screencast
    status = Column(String, default="pending")   # pending | running | passed | failed
    score = Column(Float, default=0.0)
    details = Column(JSON, nullable=True)
    checked_at = Column(DateTime(timezone=True), nullable=True)

    submission = relationship("Submission", back_populates="checks")


class Criterion(Base):
    """Organizer-configurable evaluation criterion with a relative weight."""
    __tablename__ = "criteria"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Float, nullable=False, default=1.0)   # relative weight
    max_score = Column(Integer, nullable=False, default=10)
    position = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    scores = relationship("CriterionScore", back_populates="criterion", cascade="all, delete-orphan")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    jury_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Float, nullable=False)  # weighted total, 0–50
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    team = relationship("Team", back_populates="evaluations")
    jury = relationship("User", back_populates="evaluations")
    criterion_scores = relationship("CriterionScore", back_populates="evaluation", cascade="all, delete-orphan")


class CriterionScore(Base):
    """A jury member's score for a single criterion within one evaluation."""
    __tablename__ = "criterion_scores"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=False)
    criterion_id = Column(Integer, ForeignKey("criteria.id"), nullable=False)
    score = Column(Float, nullable=False, default=0.0)

    evaluation = relationship("Evaluation", back_populates="criterion_scores")
    criterion = relationship("Criterion", back_populates="scores")


class ChecklistItem(Base):
    """Organizer-configurable required section for docs / presentation checks.

    `keyword` is the (case-insensitive) substring searched in the extracted
    text; `label` is the human-readable name shown in the UI and reports.
    """
    __tablename__ = "checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String, nullable=False, index=True)  # docs | presentation
    keyword = Column(String, nullable=False)
    label = Column(String, nullable=False)
    position = Column(Integer, default=0)


# ── Algorithmic judge ──────────────────────────────────────────────────────────

class AlgoProblem(Base):
    __tablename__ = "algo_problems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    statement = Column(Text, nullable=False)
    time_limit_ms = Column(Integer, default=2000)
    memory_limit_mb = Column(Integer, default=256)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    created_by = relationship("User", foreign_keys=[created_by_id])
    test_cases = relationship("AlgoTestCase", back_populates="problem",
                              cascade="all, delete-orphan", order_by="AlgoTestCase.id")
    submissions = relationship("AlgoSubmission", back_populates="problem", cascade="all, delete-orphan")


class AlgoTestCase(Base):
    __tablename__ = "algo_test_cases"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("algo_problems.id"), nullable=False)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=False)

    problem = relationship("AlgoProblem", back_populates="test_cases")


class AlgoSubmission(Base):
    __tablename__ = "algo_submissions"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("algo_problems.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    language = Column(String, nullable=False)  # python | cpp | java
    source_code = Column(Text, nullable=False)
    verdict = Column(String, default="pending")  # pending|running|OK|WA|TL|ML|RE|CE
    score = Column(Float, default=0.0)
    time_ms = Column(Integer, nullable=True)
    memory_mb = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    test_results = Column(JSON, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=utcnow)

    problem = relationship("AlgoProblem", back_populates="submissions")
    user = relationship("User")

import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import {
  Camera, MapPin, Phone, Mail, Calendar, Copy, FileDown, Pencil,
  Users, Trophy, Crown, CheckCircle2, Award, Rocket, Medal, ChevronRight,
  GraduationCap, Briefcase, Heart, Code2, Plus, Sparkles, Check, Github, Send,
  ClipboardCheck, BarChart3, Gavel, LayoutDashboard, SlidersHorizontal, Building2,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "../context/AuthContext"
import type { ProfilePatch } from "../context/AuthContext"
import { api } from "../lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"

interface TeamLite {
  id: number; name: string; join_code: string
  case: { title?: string | null; sponsor?: string | null } | null
  members: { user_id: number; is_leader: boolean }[]
}
interface SubmissionLite {
  repo_url?: string | null; archive_filename?: string | null
  docs_filename?: string | null; presentation_filename?: string | null
  screencast_filename?: string | null; screencast_url?: string | null
}
interface CheckLite { check_type: string; status: string; score: number }
interface RankLite { team_id: number; rank: number; total: number }
interface JuryTeam { id: number; name: string; members_count: number; auto_score: number; jury_score: number | null; my_evaluated: boolean | null }
interface MyEval { team_id: number; score: number }
interface Overview {
  total_teams: number; total_participants: number; submitted_teams: number
  total_evaluations: number; teams_evaluated: number
  avg_auto: number; avg_jury: number; avg_total: number
}

const COVERS = [
  "from-indigo-500 via-violet-500 to-purple-500",
  "from-violet-500 via-fuchsia-500 to-pink-500",
  "from-sky-500 via-cyan-500 to-teal-500",
  "from-amber-500 via-orange-600 to-rose-600",
  "from-slate-700 via-slate-800 to-slate-900",
]

export function ProfilePage() {
  const { user, role, updateAvatar, updateProfile } = useAuth()
  const avatarInput = useRef<HTMLInputElement>(null)

  const [team, setTeam] = useState<TeamLite | null>(null)
  const [sub, setSub] = useState<SubmissionLite | null>(null)
  const [checks, setChecks] = useState<CheckLite[]>([])
  const [rank, setRank] = useState<RankLite | null>(null)
  const [juryTeams, setJuryTeams] = useState<JuryTeam[]>([])
  const [myEvals, setMyEvals] = useState<MyEval[]>([])
  const [overview, setOverview] = useState<Overview | null>(null)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cover, setCover] = useState(0)

  const isPart = role === "participant"
  const isJury = role === "jury"
  const isOrg = role === "organizer"

  useEffect(() => {
    if (!user) return
    setCover(Number(localStorage.getItem(`judge_cover_${user.id}`) || 0))
  }, [user?.id])

  useEffect(() => {
    let alive = true
    if (role === "participant") {
      Promise.allSettled([
        api.get<TeamLite>("/teams/my"),
        api.get<SubmissionLite>("/submissions"),
        api.get<CheckLite[]>("/submissions/checks"),
        api.get<RankLite[]>("/leaderboard"),
      ]).then(([t, s, c, lb]) => {
        if (!alive) return
        const teamVal = t.status === "fulfilled" ? t.value : null
        setTeam(teamVal)
        if (s.status === "fulfilled") setSub(s.value)
        if (c.status === "fulfilled") setChecks(c.value)
        if (lb.status === "fulfilled" && teamVal)
          setRank(lb.value.find((r) => r.team_id === teamVal.id) ?? null)
      })
    } else if (role === "jury") {
      api.get<JuryTeam[]>("/evaluations").then((t) => { if (alive) setJuryTeams(t) }).catch(() => {})
    } else if (role === "organizer") {
      api.get<Overview>("/analytics/overview").then((o) => { if (alive) setOverview(o) }).catch(() => {})
    }
    return () => { alive = false }
  }, [role])

  if (!user) return null

  const setCoverIdx = (i: number) => { setCover(i); localStorage.setItem(`judge_cover_${user.id}`, String(i)) }

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  const avatarUrl = user.avatar_path ? `${user.avatar_path}?t=${Date.now()}` : null
  const isLeader = !!team?.members.find((m) => m.user_id === user.id && m.is_leader)
  const skills = user.skills ?? []
  const interests = user.interests ?? []

  const slots = [
    { label: "Код",         done: !!(sub?.repo_url || sub?.archive_filename) },
    { label: "Документация",done: !!sub?.docs_filename },
    { label: "Презентация", done: !!sub?.presentation_filename },
    { label: "Скринкаст",   done: !!(sub?.screencast_filename || sub?.screencast_url) },
  ]
  const doneCount = slots.filter((s) => s.done).length
  const pct = Math.round((doneCount / slots.length) * 100)
  const autoScore = checks.reduce((a, c) => a + (c.score || 0), 0)
  const allPassed = checks.length > 0 && checks.every((c) => c.status === "passed")

  // Innovation: profile completeness across editable fields + avatar
  const completionFields = [
    !!user.avatar_path, !!user.phone, !!user.city, !!user.age, !!user.bio,
    !!user.education, !!user.work, skills.length > 0, interests.length > 0,
    !!user.github || !!user.telegram,
  ]
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100)

  const achievements = [
    { icon: Rocket,       label: "Первое решение",       earned: doneCount > 0,            color: "text-indigo-400 bg-indigo-400/10" },
    { icon: CheckCircle2, label: "Решение готово",        earned: doneCount === slots.length, color: "text-emerald-400 bg-emerald-400/10" },
    { icon: Award,        label: "Все проверки пройдены", earned: allPassed,               color: "text-violet-400 bg-violet-400/10" },
    { icon: Crown,        label: "Капитан команды",       earned: isLeader,                color: "text-amber-400 bg-amber-400/10" },
    { icon: Medal,        label: "Топ-3 рейтинга",        earned: !!rank && rank.rank <= 3, color: "text-cyan-400 bg-cyan-400/10" },
    { icon: Trophy,       label: "Лидер рейтинга",        earned: rank?.rank === 1,         color: "text-yellow-400 bg-yellow-400/10" },
  ]
  const earnedCount = achievements.filter((a) => a.earned).length

  // Jury-specific
  const juryTotal = juryTeams.length
  const juryDone = juryTeams.filter((t) => t.my_evaluated).length
  const juryPct = juryTotal ? Math.round((juryDone / juryTotal) * 100) : 0
  const juryScored = juryTeams.filter((t) => t.jury_score != null)
  const juryAvg = juryScored.length ? juryScored.reduce((a, t) => a + (t.jury_score || 0), 0) / juryScored.length : 0

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ""
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Файл слишком большой (макс. 5MB)"); return }
    setUploading(true)
    try { await updateAvatar(file); toast.success("Аватар обновлён") }
    catch (err) { toast.error(err instanceof Error ? err.message : "Не удалось загрузить") }
    finally { setUploading(false) }
  }

  const downloadResume = () => {
    const L = [
      `Резюме — ${user.first_name} ${user.last_name}`,
      `Email: ${user.email}`,
      user.city && `Город: ${user.city}`,
      user.phone && `Телефон: ${user.phone}`,
      user.age && `Возраст: ${user.age}`,
      user.github && `GitHub: ${user.github}`,
      user.telegram && `Telegram: ${user.telegram}`,
      team && `Команда: ${team.name}${team.case?.title ? ` (${team.case.title})` : ""}`,
      user.bio && `\nО себе:\n${user.bio}`,
      user.work && `\nОпыт: ${user.work}`,
      user.education && `Образование: ${user.education}`,
      skills.length && `Навыки: ${skills.join(", ")}`,
      interests.length && `Интересы: ${interests.join(", ")}`,
    ].filter(Boolean).join("\n")
    const url = URL.createObjectURL(new Blob([L], { type: "text/plain;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url; a.download = `resume_${user.last_name}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
      {/* ── Header card ── */}
      <Card className="overflow-hidden p-0">
        <div className={`relative h-44 md:h-52 bg-gradient-to-r ${COVERS[cover] ?? COVERS[0]}`}>
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 15% 25%, rgba(255,255,255,.35) 0, transparent 45%), radial-gradient(circle at 85% 65%, rgba(255,255,255,.22) 0, transparent 42%)" }} />
          <Button variant="secondary" size="sm"
            onClick={() => setCoverIdx((cover + 1) % COVERS.length)}
            className="absolute top-3 right-3 gap-2 bg-white/90 hover:bg-white text-slate-900">
            <Camera className="h-4 w-4" /> Сменить обложку
          </Button>
        </div>

        <div className="px-4 md:px-8 pb-6">
          {/* Avatar with completeness ring */}
          <div className="relative block -mt-16 h-28 w-28">
            <CompletenessRing pct={completion} />
            <button onClick={() => avatarInput.current?.click()} disabled={uploading}
              className="absolute inset-[6px] rounded-3xl group ring-4 ring-card shadow-xl overflow-hidden focus:outline-none">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-brand to-brand-2 flex items-center justify-center text-brand-foreground font-bold text-3xl">{initials}</div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </button>
          </div>
          <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onAvatar} />

          {/* Name + actions */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-3">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                {user.first_name} {user.last_name}
                {isLeader && <Crown className="h-5 w-5 text-amber-400 shrink-0" />}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  {role === "organizer" ? "Организатор" : role === "jury" ? "Жюри" : "Участник"}
                </span>
                {team?.case?.sponsor && <Badge variant="outline">{team.case.sponsor}</Badge>}
                <span className="text-xs text-muted-foreground">Профиль заполнен на {completion}%</span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadResume}>
                <FileDown className="h-4 w-4" /> Резюме
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Редактировать
              </Button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-sm text-muted-foreground">
            <button onClick={() => { navigator.clipboard?.writeText(String(user.id)); toast.success("ID скопирован") }}
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">ID {user.id}</span>
              <Copy className="h-3.5 w-3.5" />
            </button>
            <MetaItem icon={Calendar} value={user.age ? `${user.age} лет` : "Возраст не указан"} muted={!user.age} />
            <MetaItem icon={MapPin} value={user.city || "Город не указан"} muted={!user.city} />
            <MetaItem icon={Phone} value={user.phone || "Телефон не указан"} muted={!user.phone} />
            <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <Mail className="h-4 w-4" /> {user.email}
            </a>
            {user.github && (
              <a href={`https://github.com/${user.github}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Github className="h-4 w-4" /> {user.github}
              </a>
            )}
            {user.telegram && (
              <a href={`https://t.me/${user.telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Send className="h-4 w-4" /> {user.telegram}
              </a>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {isPart && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Достижения
                <span className="text-xs font-normal text-muted-foreground">{earnedCount}/{achievements.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {achievements.map((a) => (
                  <div key={a.label} className="flex flex-col items-center text-center gap-1.5" title={a.label}>
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${a.earned ? a.color : "bg-muted text-muted-foreground/40"}`}>
                      <a.icon className="h-6 w-6" />
                    </div>
                    <span className={`text-[10px] leading-tight ${a.earned ? "text-foreground" : "text-muted-foreground/50"}`}>{a.label}</span>
                  </div>
                ))}
              </div>
              {earnedCount === 0 && <p className="text-xs text-muted-foreground mt-4 text-center">Пока нет достижений. Загружайте артефакты и проходите проверки.</p>}
            </CardContent>
          </Card>
          )}
          {isJury && <JuryHighlight total={juryTotal} done={juryDone} pct={juryPct} avg={juryAvg} />}
          {isOrg && <OrgHighlight o={overview} />}

          <SectionCard title="Навыки и стек" icon={Code2} onEdit={() => setEditing(true)}>
            {skills.length ? (
              <div className="flex flex-wrap gap-2">{skills.map((s) => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}</div>
            ) : <Empty text="Добавьте технологии, которыми владеете" />}
          </SectionCard>

          <SectionCard title="Образование" icon={GraduationCap} onEdit={() => setEditing(true)}>
            {user.education ? <p className="text-sm whitespace-pre-line">{user.education}</p> : <Empty text="Укажите учебное заведение" />}
          </SectionCard>

          <SectionCard title="Опыт" icon={Briefcase} onEdit={() => setEditing(true)}>
            {user.work ? <p className="text-sm whitespace-pre-line">{user.work}</p> : <Empty text="Расскажите про опыт работы" />}
          </SectionCard>
        </div>

        {/* ── Right column ── */}
        <div className="lg:col-span-2 space-y-6">
          {isJury && <JurySections total={juryTotal} done={juryDone} pct={juryPct} avg={juryAvg} />}
          {isOrg && <OrgSections o={overview} />}
          {isPart && (<>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Команда</CardTitle></CardHeader>
            <CardContent>
              {team ? (
                <Link to="/team" className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{team.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {team.case?.title ?? "Кейс не выбран"}{team.case?.sponsor ? ` · ${team.case.sponsor}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground mr-1">{team.members.length} уч.</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <Link to="/team" className="flex items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors">
                  <Plus className="h-4 w-4" /> Собрать или вступить в команду
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Готовность решения <span className="text-primary font-bold">{pct}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {slots.map((s) => (
                  <div key={s.label} className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg ${s.done ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    <CheckCircle2 className={`h-3.5 w-3.5 ${s.done ? "" : "opacity-40"}`} /> {s.label}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <StatPill value={autoScore ? autoScore.toFixed(0) : "—"} label="Авто-баллы" />
                <StatPill value={rank ? `#${rank.rank}` : "—"} label="Место" />
                <StatPill value={`${checks.filter(c => c.status === "passed").length}/${checks.length || 0}`} label="Проверок" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Активность</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="current">
                <TabsList>
                  <TabsTrigger value="current">Участие</TabsTrigger>
                  <TabsTrigger value="past">Прошедшие</TabsTrigger>
                </TabsList>
                <TabsContent value="current" className="mt-4">
                  {team?.case ? (
                    <div className="flex items-center gap-4 p-3 rounded-xl border">
                      <div className="h-11 w-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Code2 className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{team.case.title}</p>
                        <p className="text-xs text-muted-foreground">Хакатон · текущее участие</p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">Активно</Badge>
                    </div>
                  ) : <Empty text="Вы пока не участвуете в кейсе" />}
                </TabsContent>
                <TabsContent value="past" className="mt-4">
                  <Empty text="Здесь появятся завершённые мероприятия" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          </>)}

          <SectionCard title="О себе" icon={Sparkles} onEdit={() => setEditing(true)}>
            {user.bio ? <p className="text-sm whitespace-pre-line">{user.bio}</p> : <Empty text="Заполните информацию о себе" />}
          </SectionCard>

          <SectionCard title="Интересы" icon={Heart} onEdit={() => setEditing(true)}>
            {interests.length ? (
              <div className="flex flex-wrap gap-2">{interests.map((s) => <Badge key={s} variant="outline" className="font-normal">{s}</Badge>)}</div>
            ) : <Empty text="Добавьте свои интересы" />}
          </SectionCard>
        </div>
      </div>

      <EditDialog open={editing} onClose={() => setEditing(false)} user={user} onSave={updateProfile} />
    </motion.div>
  )
}

// ── Building blocks ──────────────────────────────────────────────────────────
function CompletenessRing({ pct }: { pct: number }) {
  const r = 52, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 112 112" className="absolute inset-0 h-28 w-28 -rotate-90">
      <circle cx="56" cy="56" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
      <motion.circle cx="56" cy="56" r={r} fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (c * pct) / 100 }}
        transition={{ duration: 0.8, ease: "easeOut" }} />
    </svg>
  )
}

function MetaItem({ icon: Icon, value, muted }: { icon: any; value: string; muted?: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 ${muted ? "text-muted-foreground/60" : ""}`}><Icon className="h-4 w-4" /> {value}</span>
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-xl border px-3 py-2 text-center">
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) { return <p className="text-sm text-muted-foreground">{text}</p> }

function SectionCard({ title, icon: Icon, onEdit, children }: { title: string; icon: any; onEdit: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {title}</span>
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ── Role-specific blocks ─────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
    </div>
  )
}

function QuickLinks({ items }: { items: { to: string; icon: any; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((a) => (
        <Link key={a.to + a.label} to={a.to}
          className="group flex items-center gap-3 p-4 rounded-2xl border bg-card hover:border-primary/40 hover:bg-accent/40 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <a.icon className="h-5 w-5" />
          </div>
          <span className="font-medium truncate">{a.label}</span>
        </Link>
      ))}
    </div>
  )
}

function JuryHighlight({ total, done, pct, avg }: { total: number; done: number; pct: number; avg: number }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" /> Экспертиза</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Оценено команд</span><span className="font-bold text-primary">{done}/{total}</span></div>
        <ProgressBar pct={pct} />
        <div className="flex gap-2 pt-1">
          <StatPill value={String(done)} label="Оценок" />
          <StatPill value={avg ? avg.toFixed(1) : "—"} label="Ср. балл" />
          <StatPill value={`${pct}%`} label="Прогресс" />
        </div>
      </CardContent>
    </Card>
  )
}

function OrgHighlight({ o }: { o: Overview | null }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Платформа</CardTitle></CardHeader>
      <CardContent className="flex gap-2">
        <StatPill value={o ? String(o.total_teams) : "—"} label="Команд" />
        <StatPill value={o ? String(o.total_participants) : "—"} label="Участников" />
        <StatPill value={o ? String(o.total_evaluations) : "—"} label="Оценок" />
      </CardContent>
    </Card>
  )
}

function JurySections({ total, done, pct, avg }: { total: number; done: number; pct: number; avg: number }) {
  return (
    <>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between">Оценка команд <span className="text-primary font-bold">{done}/{total}</span></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ProgressBar pct={pct} />
          <div className="flex gap-2">
            <StatPill value={`${pct}%`} label="Прогресс" />
            <StatPill value={String(Math.max(total - done, 0))} label="Осталось" />
            <StatPill value={avg ? avg.toFixed(1) : "—"} label="Ср. балл команд" />
          </div>
          <Button asChild className="w-full" variant="gradient">
            <Link to="/dashboard">{done < total ? "Продолжить оценку" : "К панели жюри"} <ChevronRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </CardContent>
      </Card>
      <QuickLinks items={[
        { to: "/dashboard", icon: ClipboardCheck, label: "Панель жюри" },
        { to: "/algo", icon: Code2, label: "Задачи" },
        { to: "/leaderboard", icon: Trophy, label: "Рейтинг" },
      ]} />
    </>
  )
}

function OrgSections({ o }: { o: Overview | null }) {
  const cells = [
    { label: "Команд", value: o?.total_teams },
    { label: "Участников", value: o?.total_participants },
    { label: "Сдано решений", value: o?.submitted_teams },
    { label: "Оценок", value: o?.total_evaluations },
    { label: "Ср. авто", value: o?.avg_auto },
    { label: "Ср. жюри", value: o?.avg_jury },
    { label: "Ср. итог", value: o?.avg_total },
    { label: "Оценено команд", value: o?.teams_evaluated },
  ]
  return (
    <>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Пульс платформы</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cells.map((c) => (
              <div key={c.label} className="rounded-xl border px-3 py-3 text-center">
                <p className="text-xl font-bold leading-none">{c.value ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5">{c.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <QuickLinks items={[
        { to: "/teams", icon: Users, label: "Команды" },
        { to: "/manage", icon: SlidersHorizontal, label: "Управление" },
        { to: "/dashboard", icon: BarChart3, label: "Аналитика" },
        { to: "/leaderboard", icon: Trophy, label: "Рейтинг" },
      ]} />
    </>
  )
}

// ── Edit dialog (persists to backend) ────────────────────────────────────────
function EditDialog({ open, onClose, user, onSave }: { open: boolean; onClose: () => void; user: any; onSave: (p: ProfilePatch) => Promise<void> }) {
  const blank = {
    first_name: "", last_name: "", city: "", phone: "", age: "", bio: "",
    education: "", work: "", github: "", telegram: "", skills: "", interests: "",
  }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      first_name: user.first_name ?? "", last_name: user.last_name ?? "",
      city: user.city ?? "", phone: user.phone ?? "", age: user.age ? String(user.age) : "",
      bio: user.bio ?? "", education: user.education ?? "", work: user.work ?? "",
      github: user.github ?? "", telegram: user.telegram ?? "",
      skills: (user.skills ?? []).join(", "), interests: (user.interests ?? []).join(", "),
    })
  }, [open, user])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const csv = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean)

  const submit = async () => {
    setSaving(true)
    try {
      await onSave({
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        city: form.city.trim() || null,
        phone: form.phone.trim() || null,
        age: form.age ? Number(form.age) : null,
        bio: form.bio.trim() || null,
        education: form.education.trim() || null,
        work: form.work.trim() || null,
        github: form.github.trim().replace(/^https?:\/\/github\.com\//, "") || null,
        telegram: form.telegram.trim() || null,
        skills: csv(form.skills),
        interests: csv(form.interests),
      })
      toast.success("Профиль сохранён")
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить")
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto scroll-slim">
        <DialogHeader><DialogTitle>Редактировать профиль</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Имя"><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
            <Field label="Фамилия"><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Город"><Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Москва" /></Field>
            <Field label="Возраст"><Input value={form.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))} placeholder="20" /></Field>
          </div>
          <Field label="Телефон"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+7 ..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GitHub (логин)"><Input value={form.github} onChange={(e) => set("github", e.target.value)} placeholder="octocat" /></Field>
            <Field label="Telegram"><Input value={form.telegram} onChange={(e) => set("telegram", e.target.value)} placeholder="@username" /></Field>
          </div>
          <Field label="О себе"><Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={3} placeholder="Коротко о себе, ролях, целях" /></Field>
          <Field label="Образование"><Input value={form.education} onChange={(e) => set("education", e.target.value)} placeholder="Вуз, специальность, годы" /></Field>
          <Field label="Опыт работы"><Input value={form.work} onChange={(e) => set("work", e.target.value)} placeholder="Должность, компания" /></Field>
          <Field label="Навыки (через запятую)"><Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Python, React, Docker" /></Field>
          <Field label="Интересы (через запятую)"><Input value={form.interests} onChange={(e) => set("interests", e.target.value)} placeholder="ML, геймдев, дизайн" /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Отмена</Button>
          <Button className="gap-2" onClick={submit} disabled={saving}><Check className="h-4 w-4" /> {saving ? "Сохранение…" : "Сохранить"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium">{label}</label>{children}</div>
}

import React, { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import {
  ArrowLeft, Github, FileText, Presentation, MonitorPlay, Archive,
  CheckCircle2, AlertCircle, Loader2, Download, ExternalLink, Star, Users, Quote,
} from "lucide-react"
import { motion } from "motion/react"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { toast } from "sonner"

interface Member { user_id: number; is_leader: boolean; user: { first_name: string; last_name: string; email: string } }
interface CheckResult { id: number; check_type: string; status: string; score: number; details: any; checked_at: string | null }
interface Evaluation {
  id: number; jury_id: number; score: number; comment: string | null; created_at: string
  jury: { first_name: string; last_name: string }
  criterion_scores: { criterion_id: number; score: number }[]
}
interface TeamFull {
  team: { id: number; name: string; join_code: string; case: { title: string; sponsor: string | null } | null; members: Member[] }
  submission: {
    repo_url: string | null; archive_filename: string | null; docs_filename: string | null
    presentation_filename: string | null; screencast_filename: string | null
    screencast_url: string | null; transcript: string | null
  } | null
  checks: CheckResult[]
  evaluations: Evaluation[]
  auto_score: number
  jury_score: number | null
}
interface Criterion { id: number; name: string; description: string | null; weight: number; max_score: number }

const CHECK_META: Record<string, { label: string; icon: any }> = {
  code: { label: "Код", icon: Github },
  docs: { label: "Документация", icon: FileText },
  presentation: { label: "Презентация", icon: Presentation },
  screencast: { label: "Скринкаст", icon: MonitorPlay },
}

export function TeamReviewPage() {
  const { id } = useParams<{ id: string }>()
  const { role } = useAuth()
  const [data, setData] = useState<TeamFull | null>(null)
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<number, number>>({})
  const [flatScore, setFlatScore] = useState(25)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    Promise.all([
      api.get<TeamFull>(`/teams/${id}/full`),
      api.get<Criterion[]>("/criteria"),
    ]).then(([full, crit]) => {
      setData(full)
      setCriteria(crit)
      const init: Record<number, number> = {}
      crit.forEach(c => { init[c.id] = Math.round(c.max_score / 2) })
      setScores(init)
    }).catch(() => toast.error("Не удалось загрузить команду"))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const previewScore = () => {
    if (criteria.length === 0 || totalWeight === 0) return flatScore
    let w = 0
    for (const c of criteria) w += (scores[c.id] ?? 0) / c.max_score * c.weight
    return Math.round(w / totalWeight * 50 * 10) / 10
  }

  const download = async (type: string) => {
    try {
      const token = JSON.parse(localStorage.getItem("judge_auth") || "{}").token
      const res = await fetch(`/api/submissions/team/${id}/download/${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) { toast.error("Файл не загружен командой"); return }
      const blob = await res.blob()
      const cd = res.headers.get("content-disposition") || ""
      const m = cd.match(/filename="?([^"]+)"?/)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = m ? decodeURIComponent(m[1]) : type; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error("Ошибка скачивания") }
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const payload = criteria.length > 0
        ? { criterion_scores: criteria.map(c => ({ criterion_id: c.id, score: scores[c.id] ?? 0 })), comment }
        : { score: flatScore, comment }
      await api.post(`/evaluations/${id}`, payload)
      toast.success("Оценка сохранена")
      setComment("")
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  if (loading) return <ReviewSkeleton />
  if (!data) return <div className="text-center text-muted-foreground py-20">Команда не найдена</div>

  const { team, submission, checks } = data

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
            {team.case && <Badge variant="secondary">{team.case.title}</Badge>}
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{team.members.length}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Авто-балл</p>
          <p className="text-2xl font-bold text-primary">{data.auto_score}<span className="text-sm text-muted-foreground">/50</span></p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: artifacts + checks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Artifacts */}
          <Card>
            <CardHeader><CardTitle className="text-base">Артефакты</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              <ArtifactRow label="Репозиторий" icon={Github}
                value={submission?.repo_url}
                action={submission?.repo_url
                  ? <a href={submission.repo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm"><ExternalLink className="h-3.5 w-3.5" />Открыть</a>
                  : null} />
              <ArtifactRow label="Архив кода" icon={Archive}
                value={submission?.archive_filename}
                action={submission?.archive_filename ? <DlBtn onClick={() => download("archive")} /> : null} />
              <ArtifactRow label="Документация" icon={FileText}
                value={submission?.docs_filename}
                action={submission?.docs_filename ? <DlBtn onClick={() => download("docs")} /> : null} />
              <ArtifactRow label="Презентация" icon={Presentation}
                value={submission?.presentation_filename}
                action={submission?.presentation_filename ? <DlBtn onClick={() => download("presentation")} /> : null} />
              <ArtifactRow label="Скринкаст" icon={MonitorPlay}
                value={submission?.screencast_filename || submission?.screencast_url}
                action={submission?.screencast_url
                  ? <a href={submission.screencast_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm"><ExternalLink className="h-3.5 w-3.5" />Смотреть</a>
                  : submission?.screencast_filename ? <DlBtn onClick={() => download("screencast")} /> : null} />
            </CardContent>
          </Card>

          {/* Transcript */}
          {submission?.transcript && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Quote className="h-4 w-4" />Транскрипция скринкаста</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">{submission.transcript}</p>
              </CardContent>
            </Card>
          )}

          {/* Auto checks */}
          <Card>
            <CardHeader><CardTitle className="text-base">Результаты автопроверок</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {checks.length === 0 && <p className="text-sm text-muted-foreground">Проверки ещё не запускались.</p>}
              {checks.map(ch => {
                const meta = CHECK_META[ch.check_type] ?? { label: ch.check_type, icon: FileText }
                const Icon = meta.icon
                return (
                  <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm flex-1">{meta.label}</span>
                    {ch.status === "passed" && <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Пройдено</Badge>}
                    {ch.status === "failed" && <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Не пройдено</Badge>}
                    {(ch.status === "running" || ch.status === "pending") && <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Проверка</Badge>}
                    <span className="font-bold text-sm w-14 text-right">{ch.score} б.</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader><CardTitle className="text-base">Участники</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {team.members.map(m => (
                <div key={m.user_id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-brand to-brand-2 flex items-center justify-center text-white text-xs font-bold">
                    {m.user.first_name[0]}{m.user.last_name[0]}
                  </div>
                  {m.user.first_name} {m.user.last_name}
                  {m.is_leader && <Star className="h-3 w-3 text-yellow-500" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: scoring panel */}
        <div className="space-y-6">
          {role === "jury" && (
            <Card className="sticky top-20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Ваша оценка</CardTitle>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Итого</p>
                    <p className="text-xl font-bold text-primary">{previewScore().toFixed(1)}<span className="text-xs text-muted-foreground">/50</span></p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {criteria.length > 0 ? criteria.map(c => {
                  const val = scores[c.id] ?? 0
                  const pct = totalWeight > 0 ? c.weight / totalWeight * 100 : 0
                  return (
                    <div key={c.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground ml-1.5">{pct.toFixed(0)}%</span>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">{val}/{c.max_score}</span>
                      </div>
                      <input type="range" min={0} max={c.max_score} value={val}
                        onChange={e => setScores({ ...scores, [c.id]: +e.target.value })}
                        className="w-full accent-primary" />
                    </div>
                  )
                }) : (
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm font-medium">Балл</span><span className="text-lg font-bold text-primary">{flatScore}</span></div>
                    <input type="range" min={0} max={50} value={flatScore} onChange={e => setFlatScore(+e.target.value)} className="w-full accent-primary" />
                  </div>
                )}
                <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Комментарий…"
                  className="w-full border rounded-lg p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                <Button className="w-full" onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                  Сохранить оценку
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Existing evaluations */}
          <Card>
            <CardHeader><CardTitle className="text-base">Оценки жюри ({data.evaluations.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.evaluations.length === 0 && <p className="text-sm text-muted-foreground">Пока нет оценок.</p>}
              {data.evaluations.map(ev => (
                <div key={ev.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{ev.jury.first_name} {ev.jury.last_name}</span>
                    <span className="font-bold text-primary">{ev.score}/50</span>
                  </div>
                  {ev.comment && <p className="text-xs text-muted-foreground italic">«{ev.comment}»</p>}
                </div>
              ))}
              {data.jury_score !== null && data.evaluations.length > 1 && (
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm font-medium">Средний балл жюри</span>
                  <span className="font-bold text-lg text-primary">{data.jury_score}/50</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ArtifactRow({ label, icon: Icon, value, action }: { label: string; icon: any; value?: string | null; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{value || "Не загружено"}</p>
      </div>
      {action}
    </div>
  )
}

function DlBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-primary hover:underline flex items-center gap-1 text-sm shrink-0"><Download className="h-3.5 w-3.5" />Скачать</button>
}

function ReviewSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Skeleton className="h-10 w-64" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}

import React, { useEffect, useState } from "react"
import { Link } from "react-router"
import { motion, type Variants } from "motion/react"
import {
  Calendar, Code, Brain, HeartPulse, Gamepad2, ArrowRight, Users, UploadCloud,
  Terminal, Trophy, Gauge, Target, BadgeCheck, Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"

interface TeamLite { id: number; name: string; case: { title?: string | null; sponsor?: string | null } | null; members: { user_id: number }[] }
interface SubmissionLite { repo_url?: string | null; archive_filename?: string | null; docs_filename?: string | null; presentation_filename?: string | null; screencast_filename?: string | null; screencast_url?: string | null }
interface CheckLite { status: string; score: number }
interface RankLite { team_id: number; rank: number }

const cases = [
  { id: "fintech", title: "Финтех: Автоматизация скоринга", sponsor: "Сбер", icon: Code, color: "text-brand", bg: "bg-brand/10", desc: "Алгоритм на базе ML для оценки кредитоспособности малого бизнеса по косвенным признакам." },
  { id: "edtech", title: "EdTech: ИИ для проверки ДЗ", sponsor: "Яндекс", icon: Brain, color: "text-brand-2", bg: "bg-brand-2/10", desc: "Система автоматической проверки открытых ответов студентов на базе LLM с фидбеком." },
  { id: "medtech", title: "MedTech: Анализ снимков МРТ", sponsor: "Минздрав", icon: HeartPulse, color: "text-rose-400", bg: "bg-rose-400/10", desc: "Нейросеть для сегментации и поиска патологий на МРТ снимках головного мозга." },
  { id: "gamedev", title: "Gamedev: Мультиплеерный движок", sponsor: "VK Play", icon: Gamepad2, color: "text-cyan-400", bg: "bg-cyan-400/10", desc: "Сетевой код для синхронизации 100+ игроков на одной карте с минимальной задержкой." },
]

const schedule = [
  { time: "Пт, 18:00", event: "Церемония открытия и презентация кейсов" },
  { time: "Пт, 20:00", event: "Начало кодинга, старт формирования команд" },
  { time: "Сб, 12:00", event: "Первый чекпоинт с экспертами (менторская сессия)" },
  { time: "Вс, 10:00", event: "Окончание приёма решений (дедлайн загрузки)" },
  { time: "Вс, 15:00", event: "Питчинг решений перед жюри и награждение" },
]

const fade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, type: "spring", stiffness: 120, damping: 18 } }),
}

export function ParticipantHome() {
  const { user } = useAuth()
  const [team, setTeam] = useState<TeamLite | null>(null)
  const [sub, setSub] = useState<SubmissionLite | null>(null)
  const [checks, setChecks] = useState<CheckLite[]>([])
  const [rank, setRank] = useState<RankLite | null>(null)

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      api.get<TeamLite>("/teams/my"),
      api.get<SubmissionLite>("/submissions"),
      api.get<CheckLite[]>("/submissions/checks"),
      api.get<RankLite[]>("/leaderboard"),
    ]).then(([t, s, c, lb]) => {
      if (!alive) return
      const tv = t.status === "fulfilled" ? t.value : null
      setTeam(tv)
      if (s.status === "fulfilled") setSub(s.value)
      if (c.status === "fulfilled") setChecks(c.value)
      if (lb.status === "fulfilled" && tv) setRank(lb.value.find((r) => r.team_id === tv.id) ?? null)
    })
    return () => { alive = false }
  }, [])

  const slots = [
    !!(sub?.repo_url || sub?.archive_filename), !!sub?.docs_filename,
    !!sub?.presentation_filename, !!(sub?.screencast_filename || sub?.screencast_url),
  ]
  const pct = Math.round((slots.filter(Boolean).length / slots.length) * 100)
  const autoScore = checks.reduce((a, c) => a + (c.score || 0), 0)
  const passed = checks.filter((c) => c.status === "passed").length

  const stats = [
    { icon: Gauge, label: "Готовность", value: `${pct}%`, accent: "text-brand" },
    { icon: BadgeCheck, label: "Авто-баллы", value: autoScore ? autoScore.toFixed(0) : "—", accent: "text-brand-2" },
    { icon: Trophy, label: "Место", value: rank ? `#${rank.rank}` : "—", accent: "text-cyan-400" },
    { icon: Target, label: "Проверок", value: `${passed}/${checks.length || 0}`, accent: "text-emerald-400" },
  ]

  const actions = [
    { to: "/team", icon: Users, label: "Моя команда", hint: team ? team.name : "Собрать команду" },
    { to: "/submission", icon: UploadCloud, label: "Решение", hint: `${pct}% готово` },
    { to: "/algo", icon: Terminal, label: "Задачи", hint: "Алгопесочница" },
    { to: "/leaderboard", icon: Trophy, label: "Рейтинг", hint: rank ? `Вы #${rank.rank}` : "Таблица лидеров" },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div variants={fade} custom={0} initial="hidden" animate="show"
        className="relative overflow-hidden rounded-3xl border bg-card backdrop-blur-xl p-6 md:p-8">
        <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-brand-2/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand/10 px-2.5 py-1 rounded-full mb-3">
              <Sparkles className="h-3 w-3" /> Личный кабинет
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Привет, {user?.first_name ?? "участник"}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {team ? `Команда «${team.name}» · ${team.case?.title ?? "кейс не выбран"}` : "Сформируй команду и выбери кейс, чтобы начать."}
            </p>
          </div>
          <Button asChild size="lg" variant="gradient" className="rounded-xl shrink-0">
            <Link to={team ? "/submission" : "/team"}>
              {team ? "К решению" : "Собрать команду"} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stat widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} variants={fade} custom={i + 1} initial="hidden" animate="show">
            <Card className="p-5 hover:-translate-y-0.5 transition-transform">
              <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3 ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-bold tracking-tight mb-3">Быстрые действия</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((a, i) => (
            <motion.div key={a.to} variants={fade} custom={i + 1} initial="hidden" animate="show">
              <Link to={a.to}
                className="group flex items-center gap-3 p-4 rounded-2xl border bg-card backdrop-blur-xl hover:border-primary/40 hover:bg-accent/40 transition-colors">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.hint}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cases + schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Доступные кейсы (треки)</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {cases.map((c, i) => (
              <motion.div key={c.id} variants={fade} custom={i + 1} initial="hidden" animate="show">
                <Card className="flex flex-col h-full hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2.5 rounded-xl ${c.bg}`}><c.icon className={`h-6 w-6 ${c.color}`} /></div>
                      <Badge variant="outline">{c.sponsor}</Badge>
                    </div>
                    <CardTitle className="text-base leading-tight">{c.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground flex-1">{c.desc}</p>
                    <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary hover:bg-primary/10" asChild>
                      <Link to="/team">Выбрать кейс <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Расписание</h2>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Calendar className="h-5 w-5 mr-2 text-primary" /> Таймлайн
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {schedule.map((item, i) => (
                  <div key={i} className="flex relative">
                    <div className="flex flex-col items-center mr-4">
                      <div className="h-3 w-3 rounded-full bg-primary/20 border-2 border-primary mt-1 z-10" />
                      {i !== schedule.length - 1 && <div className="w-px h-full bg-border absolute top-4 bottom-[-1.5rem]" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-bold text-foreground">{item.time}</p>
                      <p className="text-sm text-muted-foreground leading-snug mt-0.5">{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

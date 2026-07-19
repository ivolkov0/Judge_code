import React, { useEffect, useState } from "react"
import { Link } from "react-router"
import { motion } from "motion/react"
import {
  Settings, LogOut, Users, UploadCloud, Trophy, Terminal,
  Sun, Moon, ChevronRight, Crown, CheckCircle2, Sparkles,
  LayoutDashboard, SlidersHorizontal, User as UserIcon,
} from "lucide-react"
import { api } from "../lib/api"
import type { AuthUser, Role } from "../context/AuthContext"

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

const roleMeta: Record<string, { label: string; cover: string }> = {
  participant: { label: "Участник",    cover: "from-emerald-500 via-teal-500 to-green-500" },
  jury:        { label: "Жюри",        cover: "from-purple-600 via-fuchsia-600 to-pink-600" },
  organizer:   { label: "Организатор", cover: "from-amber-500 via-orange-600 to-rose-600" },
}

interface Props {
  user: AuthUser | null
  role: Role
  theme: string | undefined
  setTheme: (t: string) => void
  onClose: () => void
  onLogout: () => void
}

export function ProfileMenu({ user, role, theme, setTheme, onClose, onLogout }: Props) {
  const isParticipant = role === "participant"
  const meta = roleMeta[role || "participant"] ?? roleMeta.participant

  const [team, setTeam] = useState<TeamLite | null>(null)
  const [sub, setSub] = useState<SubmissionLite | null>(null)
  const [checks, setChecks] = useState<CheckLite[]>([])
  const [rank, setRank] = useState<RankLite | null>(null)
  const [loading, setLoading] = useState(isParticipant)

  useEffect(() => {
    if (!isParticipant) return
    let alive = true
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
      if (lb.status === "fulfilled" && teamVal) {
        setRank(lb.value.find((r) => r.team_id === teamVal.id) ?? null)
      }
      setLoading(false)
    })
    return () => { alive = false }
  }, [isParticipant])

  const initials = user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : "JU"

  const slots = [
    { label: "Код",         done: !!(sub?.repo_url || sub?.archive_filename) },
    { label: "Документация",done: !!sub?.docs_filename },
    { label: "Презентация", done: !!sub?.presentation_filename },
    { label: "Скринкаст",   done: !!(sub?.screencast_filename || sub?.screencast_url) },
  ]
  const doneCount = slots.filter((s) => s.done).length
  const pct = Math.round((doneCount / slots.length) * 100)
  const autoScore = checks.reduce((acc, c) => acc + (c.score || 0), 0)
  const passedCount = checks.filter((c) => c.status === "passed").length
  const isLeader = !!team?.members.find((m) => m.user_id === user?.id && m.is_leader)

  const quickLinks = isParticipant
    ? [
        { to: "/team",        icon: Users,       label: "Моя команда" },
        { to: "/submission",  icon: UploadCloud, label: "Решение" },
        { to: "/algo",        icon: Terminal,    label: "Задачи" },
        { to: "/leaderboard", icon: Trophy,      label: "Рейтинг" },
      ]
    : role === "organizer"
    ? [
        { to: "/dashboard",   icon: LayoutDashboard,    label: "Главная" },
        { to: "/teams",       icon: Users,              label: "Команды" },
        { to: "/manage",      icon: SlidersHorizontal,  label: "Управление" },
        { to: "/leaderboard", icon: Trophy,             label: "Рейтинг" },
      ]
    : [
        { to: "/dashboard",   icon: LayoutDashboard, label: "Панель" },
        { to: "/algo",        icon: Terminal,        label: "Задачи" },
        { to: "/leaderboard", icon: Trophy,          label: "Рейтинг" },
      ]

  return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="absolute right-0 mt-2 w-[22rem] bg-popover border rounded-2xl shadow-2xl overflow-hidden z-50"
      >
        {/* ── Cover + identity ── */}
        <div className={`relative h-20 bg-gradient-to-r ${meta.cover}`}>
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,.35) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.2) 0, transparent 40%)" }} />
          <span className="absolute top-2.5 right-3 inline-flex items-center gap-1 text-[11px] font-semibold text-white/90 bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">
            <Sparkles className="h-3 w-3" /> {meta.label}
          </span>
        </div>

        <Link to="/profile" onClick={onClose} className="block px-4 pb-3 group">
          <div className="relative z-10 -mt-8">
            {user?.avatar_path ? (
              <img src={user.avatar_path} alt="avatar"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                className="h-16 w-16 rounded-2xl object-cover ring-4 ring-popover shadow-lg" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand to-brand-2 flex items-center justify-center text-brand-foreground font-bold text-xl ring-4 ring-popover shadow-lg">
                {initials}
              </div>
            )}
          </div>
          <div className="mt-2 min-w-0">
            <p className="font-semibold text-popover-foreground truncate flex items-center gap-1.5 group-hover:text-primary transition-colors">
              {user ? `${user.first_name} ${user.last_name}` : meta.label}
              {isParticipant && isLeader && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>
        </Link>

        {/* ── Participant cabinet ── */}
        {isParticipant && (
          <div className="px-4 pb-2 space-y-3">
            {/* Team strip */}
            {team ? (
              <Link to="/team" onClick={onClose}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-popover-foreground truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {team.case?.title ?? "Кейс не выбран"}
                    {team.case?.sponsor ? ` · ${team.case.sponsor}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>
            ) : !loading ? (
              <Link to="/team" onClick={onClose}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-primary/40 hover:bg-primary/5 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">Собрать команду</p>
                  <p className="text-xs text-muted-foreground">Вы пока не в команде</p>
                </div>
                <ChevronRight className="h-4 w-4 text-primary shrink-0" />
              </Link>
            ) : (
              <div className="h-[58px] rounded-xl bg-muted/40 animate-pulse" />
            )}

            {/* Submission progress */}
            <div className="p-2.5 rounded-xl bg-muted/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-popover-foreground">Готовность решения</span>
                <span className="text-xs font-bold text-primary">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {slots.map((s) => (
                  <span key={s.label} className={`inline-flex items-center gap-1 text-[11px] ${s.done ? "text-green-500" : "text-muted-foreground/60"}`}>
                    <CheckCircle2 className={`h-3 w-3 ${s.done ? "" : "opacity-40"}`} />{s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Stat value={autoScore ? autoScore.toFixed(0) : "—"} label="Авто-баллы" />
              <Stat value={rank ? `#${rank.rank}` : "—"} label="Место" />
              <Stat value={`${passedCount}/${checks.length || 0}`} label="Проверок" />
            </div>
          </div>
        )}

        {/* ── Quick links ── */}
        <div className="px-2 py-2 border-t mt-1">
          <div className="grid grid-cols-2 gap-1">
            {quickLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={onClose}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-popover-foreground hover:bg-accent transition-colors">
                <l.icon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="px-2 pb-2 border-t pt-1.5 space-y-0.5">
          <Link to="/profile" onClick={onClose}
            className="flex items-center px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent rounded-lg transition-colors">
            <UserIcon className="h-4 w-4 mr-2.5 text-muted-foreground" /> Мой профиль
          </Link>
          <Link to="/settings" onClick={onClose}
            className="flex items-center px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent rounded-lg transition-colors">
            <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" /> Настройки профиля
          </Link>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent rounded-lg transition-colors">
            {theme === "dark"
              ? <Sun className="h-4 w-4 mr-2.5 text-muted-foreground" />
              : <Moon className="h-4 w-4 mr-2.5 text-muted-foreground" />}
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </button>
          <button onClick={onLogout}
            className="w-full flex items-center px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
            <LogOut className="h-4 w-4 mr-2.5" /> Выйти
          </button>
        </div>
      </motion.div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-2 py-2 text-center">
      <p className="text-base font-bold text-popover-foreground leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

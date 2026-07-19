import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import { Trophy, Medal, Crown, RefreshCw } from "lucide-react"
import { motion } from "motion/react"
import confetti from "canvas-confetti"
import { api } from "../lib/api"

interface LeaderboardEntry {
  rank: number; team_id: number; team_name: string; case_title: string | null
  members_count: number; auto_score: number; jury_score: number; total: number
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [caseFilter, setCaseFilter] = useState<string>("all")
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = (withConfetti = false) => {
    api.get<LeaderboardEntry[]>("/leaderboard")
      .then((data) => {
        setEntries(data)
        if (withConfetti && data.length > 0) fireConfetti()
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(true) }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => load(false), 5000)
    return () => clearInterval(id)
  }, [autoRefresh])

  const cases = useMemo(
    () => Array.from(new Set(entries.map(e => e.case_title).filter(Boolean))) as string[],
    [entries]
  )

  const filtered = useMemo(() => {
    const list = caseFilter === "all" ? entries : entries.filter(e => e.case_title === caseFilter)
    // Re-rank within filter
    return [...list].sort((a, b) => b.total - a.total).map((e, i) => ({ ...e, rank: i + 1 }))
  }, [entries, caseFilter])

  const podium = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  const fireConfetti = () => {
    const duration = 2.5 * 1000
    const end = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 }
    const rnd = (min: number, max: number) => Math.random() * (max - min) + min
    const tick = () => {
      const left = end - Date.now()
      if (left <= 0) return
      const count = 50 * (left / duration)
      confetti({ ...defaults, particleCount: count, origin: { x: rnd(0.1, 0.3), y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount: count, origin: { x: rnd(0.7, 0.9), y: Math.random() - 0.2 } })
      setTimeout(tick, 250)
    }
    tick()
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center">
        <Trophy className="h-14 w-14 text-yellow-500 mx-auto mb-4 drop-shadow-md" />
        <h1 className="text-4xl font-bold tracking-tight">Рейтинг команд</h1>
        <p className="text-muted-foreground mt-2 text-lg">Авто-баллы (макс. 50) + Баллы жюри (макс. 50).</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={caseFilter === "all"} onClick={() => setCaseFilter("all")}>Все кейсы</FilterChip>
          {cases.map(c => (
            <FilterChip key={c} active={caseFilter === c} onClick={() => setCaseFilter(c)}>{c}</FilterChip>
          ))}
        </div>
        <button
          onClick={() => setAutoRefresh(a => !a)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${autoRefresh ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted"}`}>
          <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
          {autoRefresh ? "Авто-обновление" : "Обновлять авто"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Результатов пока нет.</CardContent></Card>
      ) : (
        <>
          {/* Podium */}
          {podium.length >= 1 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
              {podium[1] && <PodiumCard entry={podium[1]} place={2} />}
              {podium[0] && <PodiumCard entry={podium[0]} place={1} />}
              {podium[2] && <PodiumCard entry={podium[2]} place={3} />}
            </div>
          )}

          {/* Table */}
          {rest.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Остальные команды</CardTitle>
                <CardDescription>Места с 4-го и ниже.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Место</th>
                        <th className="px-4 py-3">Команда</th>
                        <th className="px-4 py-3">Трек</th>
                        <th className="px-4 py-3 text-center">Авто</th>
                        <th className="px-4 py-3 text-center">Жюри</th>
                        <th className="px-4 py-3 text-right rounded-tr-lg">Итого</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((team, index) => (
                        <motion.tr key={team.team_id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4 font-bold text-muted-foreground">{team.rank}</td>
                          <td className="px-4 py-4 font-semibold">{team.team_name}</td>
                          <td className="px-4 py-4 text-muted-foreground">{team.case_title ?? "—"}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono text-brand">{team.auto_score}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono text-brand-2">{team.jury_score}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <ScoreBar auto={team.auto_score} jury={team.jury_score} total={team.total} />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const styles = {
    1: { h: "pt-6 pb-7", ring: "ring-2 ring-yellow-400", grad: "from-yellow-400/20 to-amber-500/5", icon: <Crown className="h-7 w-7 text-yellow-500" />, label: "text-yellow-600" },
    2: { h: "pt-5 pb-6", ring: "ring-1 ring-gray-300", grad: "from-gray-300/20 to-slate-400/5", icon: <Medal className="h-6 w-6 text-gray-400" />, label: "text-gray-500" },
    3: { h: "pt-5 pb-6", ring: "ring-1 ring-amber-700/40", grad: "from-amber-700/20 to-amber-800/5", icon: <Medal className="h-6 w-6 text-amber-700" />, label: "text-amber-700" },
  }[place]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: place === 1 ? 0 : 0.15, type: "spring", stiffness: 200, damping: 20 }}
      className={`rounded-2xl border bg-gradient-to-b ${styles.grad} ${styles.ring} ${styles.h} px-3 text-center shadow-sm`}>
      <div className="flex justify-center mb-2">{styles.icon}</div>
      <p className={`text-xs font-bold uppercase tracking-wide ${styles.label}`}>{place} место</p>
      <p className="font-bold text-base sm:text-lg mt-1 leading-tight truncate">{entry.team_name}</p>
      <p className="text-xs text-muted-foreground truncate mb-2">{entry.case_title ?? "—"}</p>
      <p className="text-3xl font-extrabold">{entry.total}</p>
      <div className="flex justify-center gap-2 text-xs text-muted-foreground mt-1">
        <span className="text-brand">А {entry.auto_score}</span>
        <span className="text-brand-2">Ж {entry.jury_score}</span>
      </div>
    </motion.div>
  )
}

function ScoreBar({ auto, jury, total }: { auto: number; jury: number; total: number }) {
  const max = 100
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="hidden sm:flex h-2 w-24 rounded-full overflow-hidden bg-muted">
        <div className="bg-brand" style={{ width: `${auto / max * 100}%` }} />
        <div className="bg-brand-2" style={{ width: `${jury / max * 100}%` }} />
      </div>
      <span className="text-lg font-bold w-12 text-right">{total}</span>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-muted border-border"}`}>
      {children}
    </button>
  )
}

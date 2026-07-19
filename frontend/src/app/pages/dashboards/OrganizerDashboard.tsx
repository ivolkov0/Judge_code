import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Skeleton } from "../../components/ui/skeleton"
import { Users, FileText, CheckCircle2, BarChart3, Download, Trophy, Layers } from "lucide-react"
import { motion } from "motion/react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import { useTheme } from "next-themes"
import { api } from "../../lib/api"
import { toast } from "sonner"

interface Overview {
  total_teams: number; total_participants: number; submitted_teams: number
  total_evaluations: number; teams_evaluated: number
  avg_auto: number; avg_jury: number; avg_total: number
  score_distribution: { label: string; count: number }[]
  check_pass_rates: { check_type: string; passed: number; failed: number; pending: number; avg_score: number }[]
  case_breakdown: { case: string; teams: number; avg_total: number }[]
}

const CHECK_LABELS: Record<string, string> = {
  code: "Код", docs: "Документация", presentation: "Презентация", screencast: "Скринкаст",
}

export function OrganizerDashboard() {
  const { theme } = useTheme()
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const primary = theme === "dark" ? "#818cf8" : "#4f46e5"
  const green = "#10b981", red = "#ef4444"

  useEffect(() => {
    api.get<Overview>("/analytics/overview")
      .then(setData)
      .catch(() => toast.error("Не удалось загрузить аналитику"))
      .finally(() => setLoading(false))
  }, [])

  const [exporting, setExporting] = useState(false)

  const exportCsv = async () => {
    setExporting(true)
    try {
      const token = JSON.parse(localStorage.getItem("judge_auth") || "{}").token
      const res = await fetch("/api/analytics/export", { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { toast.error("Не удалось выгрузить результаты"); return }
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") || ""
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : "judge_results.csv"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      toast.success("Результаты выгружены в CSV")
    } catch {
      toast.error("Не удалось выгрузить результаты")
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <DashboardSkeleton />
  if (!data) return null

  const passRateData = data.check_pass_rates.map(p => ({
    name: CHECK_LABELS[p.check_type] ?? p.check_type,
    passed: p.passed, failed: p.failed, avg: p.avg_score,
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Обзор хакатона</h1>
          <p className="text-muted-foreground mt-1">Реальная статистика по командам, проверкам и оценкам.</p>
        </div>
        <Button onClick={exportCsv} variant="outline" disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />{exporting ? "Выгрузка…" : "Экспорт CSV"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Команд" value={String(data.total_teams)} icon={Users}
          trend={`${data.total_participants} участников`} />
        <StatCard title="Сдали решение" value={String(data.submitted_teams)} icon={FileText}
          trend={`${data.total_teams ? Math.round(data.submitted_teams / data.total_teams * 100) : 0}% команд`} />
        <StatCard title="Оценено жюри" value={`${data.teams_evaluated}/${data.total_teams}`} icon={CheckCircle2}
          trend={`${data.total_evaluations} оценок всего`} />
        <StatCard title="Средний балл" value={data.avg_total.toFixed(1)} icon={Trophy}
          trend={`авто ${data.avg_auto} · жюри ${data.avg_jury}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Score distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Распределение итоговых баллов</CardTitle>
            <CardDescription>Сколько команд в каждом диапазоне (0–100).</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" name="Команд" radius={[6, 6, 0, 0]}>
                  {data.score_distribution.map((_, i) => <Cell key={i} fill={primary} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pass rates */}
        <Card>
          <CardHeader>
            <CardTitle>Прохождение автопроверок</CardTitle>
            <CardDescription>Пройдено / не пройдено по типам.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={passRateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: 8 }} />
                <Bar dataKey="passed" name="Пройдено" stackId="a" fill={green} radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" name="Не пройдено" stackId="a" fill={red} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Case breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Средний балл по кейсам</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.case_breakdown.length === 0 && <p className="text-muted-foreground text-sm">Нет данных.</p>}
          {data.case_breakdown.map(cb => {
            const pct = Math.min(cb.avg_total, 100)
            return (
              <div key={cb.case} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{cb.case}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">{cb.teams} команд · {cb.avg_total} балл</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatCard({ title, value, icon: Icon, trend }: { title: string; value: string; icon: any; trend: string }) {
  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
        <Icon className="h-24 w-24" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[340px] rounded-xl" />
        <Skeleton className="h-[340px] rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

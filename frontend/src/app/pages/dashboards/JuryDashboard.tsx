import React, { useState, useEffect } from "react"
import { Link } from "react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Skeleton } from "../../components/ui/skeleton"
import { Clock, CheckCircle2, BarChart3, Star, ChevronRight, Users } from "lucide-react"
import { motion } from "motion/react"
import { api } from "../../lib/api"

interface TeamItem {
  id: number; name: string; case: { title: string } | null
  members_count: number; status: string; auto_score: number; jury_score: number | null
  my_evaluated: boolean
}

export function JuryDashboard() {
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<TeamItem[]>("/evaluations")
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setLoading(false))
  }, [])

  const pending = teams.filter(t => !t.my_evaluated)
  const done = teams.filter(t => t.my_evaluated)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Панель жюри</h1>
        <p className="text-muted-foreground mt-1">Открывайте команды и выставляйте экспертные оценки.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Ожидают оценки" value={String(pending.length)} icon={Clock} trend="Требуется действие" accent="text-amber-500" />
        <StatCard title="Оценено вами" value={String(done.length)} icon={CheckCircle2} trend="Готово" accent="text-green-500" />
        <StatCard title="Команд всего" value={String(teams.length)} icon={BarChart3} trend="На хакатоне" accent="text-primary" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground gap-3">
            <Users className="h-12 w-12 opacity-30" />
            <p className="text-lg">Команд для оценки пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Очередь проверок</CardTitle>
            <CardDescription>Нажмите на команду, чтобы открыть полную карточку с артефактами.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teams.map((team, i) => (
                <motion.div key={team.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={`/review/${team.id}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/40 transition-colors gap-4 group">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg group-hover:text-primary transition-colors">{team.name}</span>
                        {team.case && <Badge variant="secondary" className="text-xs">{team.case.title}</Badge>}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Участников: {team.members_count} · Авто-балл: {team.auto_score.toFixed(1)}/50
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {team.my_evaluated ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Оценено вами</Badge>
                      ) : (
                        <span className="flex items-center text-sm text-primary font-medium"><Star className="h-4 w-4 mr-1" />Оценить</span>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

function StatCard({ title, value, icon: Icon, trend, accent }: { title: string; value: string; icon: any; trend: string; accent: string }) {
  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
        <Icon className="h-24 w-24" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </CardContent>
    </Card>
  )
}

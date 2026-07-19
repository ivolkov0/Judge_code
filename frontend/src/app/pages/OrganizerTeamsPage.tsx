import React, { useState, useEffect } from "react"
import { Link } from "react-router"
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Skeleton } from "../components/ui/skeleton"
import { Users, Search, FileText, AlertCircle, ChevronRight } from "lucide-react"
import { motion } from "motion/react"
import { api } from "../lib/api"

interface TeamItem {
  id: number; name: string; case: { title: string } | null
  members_count: number; status: string; auto_score: number; jury_score: number | null
}

const STATUS_COLORS: Record<string, string> = {
  Submitted: "bg-green-500/10 text-green-600",
  Reviewing: "bg-yellow-500/10 text-yellow-600",
  Coding:    "bg-blue-500/10 text-blue-600",
}

export function OrganizerTeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    api.get<TeamItem[]>("/teams")
      .then(setTeams)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.case?.title ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const submitted = teams.filter((t) => t.status === "Submitted").length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление командами</h1>
          <p className="text-muted-foreground mt-1">Список всех зарегистрированных команд хакатона.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-sm bg-primary/5">Всего команд: {teams.length}</Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-sm bg-green-500/10 text-green-600">Сдали решения: {submitted}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Поиск команды или кейса..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((team) => (
                <Link key={team.id} to={`/review/${team.id}`}
                  className="border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group bg-card block">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{team.name}</h3>
                    <Badge variant="outline" className={`border-0 ${STATUS_COLORS[team.status] ?? ""}`}>{team.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{team.case?.title ?? "Без трека"}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border/50 text-sm text-muted-foreground">
                    <div className="flex items-center"><Users className="h-4 w-4 mr-1.5" />{team.members_count}/5</div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1.5" />
                      {team.auto_score > 0 ? `Авто: ${team.auto_score.toFixed(0)}` : "—"}
                    </div>
                    {team.jury_score !== null && (
                      <div className="flex items-center text-brand-2">Жюри: {team.jury_score.toFixed(0)}</div>
                    )}
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center">
                  <AlertCircle className="h-10 w-10 mb-3 text-muted-foreground/50" />
                  <p>Команды не найдены</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

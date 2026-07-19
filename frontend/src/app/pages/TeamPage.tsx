import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs"
import { Users, ArrowRight, UserPlus, Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { Link } from "react-router"
import { api } from "../lib/api"
import { useAuth } from "../context/AuthContext"

interface Case { id: number; slug: string; title: string; sponsor: string | null }
interface Member { user_id: number; is_leader: boolean; user: { first_name: string; last_name: string; email: string } }
interface Team { id: number; name: string; join_code: string; case: Case | null; members: Member[]; created_at: string }

export function TeamPage() {
  const { role } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [codeCopied, setCodeCopied] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [selectedCase, setSelectedCase] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (role !== "participant") { setLoading(false); return }
    api.get<Case[]>("/cases").then(setCases).catch(() => setCases([]))
    api.get<Team>("/teams/my")
      .then(setTeam)
      .catch(() => setTeam(null))
      .finally(() => setLoading(false))
  }, [role])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const t = await api.post<Team>("/teams", { name: teamName, case_slug: selectedCase || null })
      setTeam(t)
    } catch (err: any) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const t = await api.post<Team>("/teams/join", { join_code: joinCode })
      setTeam(t)
    } catch (err: any) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  const copyCode = () => {
    if (team?.join_code) {
      navigator.clipboard.writeText(team.join_code)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  if (role !== "participant") return (
    <div className="max-w-2xl mx-auto mt-20 text-center">
      <h1 className="text-2xl font-bold mb-2">Страница недоступна</h1>
      <p className="text-muted-foreground">Управление командами доступно только участникам.</p>
    </div>
  )

  if (team) return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Моя команда</h1>
        <p className="text-muted-foreground mt-1">Управляйте составом и отслеживайте прогресс.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{team.name}</CardTitle>
              {team.case && <CardDescription className="mt-1">{team.case.title} · <span className="font-medium">{team.case.sponsor}</span></CardDescription>}
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">{team.members.length}/5 участников</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-2">Код для вступления</p>
            <div className="flex items-center gap-3">
              <code className="font-mono text-2xl font-bold tracking-widest bg-muted px-4 py-2 rounded-lg">{team.join_code}</code>
              <Button variant="outline" size="icon" onClick={copyCode}>
                {codeCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Поделитесь кодом с участниками для вступления.</p>
          </div>
          <div>
            <p className="text-sm font-medium mb-3">Состав команды</p>
            <div className="space-y-2">
              {team.members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand to-brand-2 flex items-center justify-center text-white text-xs font-bold">
                      {m.user.first_name[0]}{m.user.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{m.user.first_name} {m.user.last_name}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </div>
                  </div>
                  {m.is_leader && <Badge className="text-xs">Капитан</Badge>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link to="/submission">Перейти к сдаче решения <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Моя команда</h1>
        <p className="text-muted-foreground mt-1">Создайте новую команду или присоединитесь к существующей.</p>
      </div>
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="create">Создать команду</TabsTrigger>
          <TabsTrigger value="join">Присоединиться к команде</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card>
            <form onSubmit={handleCreate}>
              <CardHeader>
                <CardTitle>Создание новой команды</CardTitle>
                <CardDescription>Придумайте название и выберите трек (кейс).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Название команды</label>
                  <Input placeholder="Например: CodeSamurais" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Выберите трек</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {cases.length === 0 && <p className="text-sm text-muted-foreground col-span-2">Кейсы ещё не настроены организатором.</p>}
                    {cases.map((c) => (
                      <div key={c.slug} onClick={() => setSelectedCase(c.slug)}
                        className={`p-3 border rounded-xl cursor-pointer transition-all ${selectedCase === c.slug ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                        <p className="font-medium text-sm">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.sponsor}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {formError && <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Создать команду
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="join">
          <Card>
            <form onSubmit={handleJoin}>
              <CardHeader>
                <CardTitle>Присоединиться по коду</CardTitle>
                <CardDescription>Введите 6-значный код команды.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Код команды</label>
                  <Input placeholder="SAM001" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="font-mono text-xl tracking-widest text-center uppercase" maxLength={6} required />
                </div>
                {formError && <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Вступить в команду
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

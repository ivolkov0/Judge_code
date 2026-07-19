import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Textarea } from "../components/ui/textarea"
import { Code2, Plus, Clock, Cpu, CheckCircle2, XCircle, Loader2, Trash2, Edit2 } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { toast } from "sonner"

interface Problem {
  id: number
  title: string
  time_limit_ms: number
  memory_limit_mb: number
  created_at: string
  test_count: number
  my_best_verdict: string | null
}

const VERDICT_COLORS: Record<string, string> = {
  OK:      "bg-green-500/15 text-green-600 border-green-300",
  WA:      "bg-red-500/15 text-red-600 border-red-300",
  TL:      "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  ML:      "bg-orange-500/15 text-orange-600 border-orange-300",
  RE:      "bg-purple-500/15 text-purple-600 border-purple-300",
  CE:      "bg-slate-500/15 text-slate-600 border-slate-300",
  pending: "bg-muted text-muted-foreground border-border",
  running: "bg-blue-500/15 text-blue-600 border-blue-300",
}

export function AlgoPage() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: "", statement: "", time_limit_ms: 2000, memory_limit_mb: 256 })

  const load = () => {
    setLoading(true)
    api.get<Problem[]>("/algo/problems")
      .then(setProblems)
      .catch(() => toast.error("Не удалось загрузить задачи"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.statement.trim()) {
      toast.error("Заполните название и условие")
      return
    }
    setCreating(true)
    try {
      const p = await api.post<Problem>("/algo/problems", form)
      toast.success("Задача создана")
      setShowCreate(false)
      setForm({ title: "", statement: "", time_limit_ms: 2000, memory_limit_mb: 256 })
      navigate(`/algo/${p.id}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm("Удалить задачу?")) return
    try {
      await api.delete(`/algo/problems/${id}`)
      setProblems(p => p.filter(x => x.id !== id))
      toast.success("Задача удалена")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Code2 className="h-8 w-8 text-primary" /> Алгоритмические задачи
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === "organizer"
              ? "Управляйте задачами и тестами"
              : "Решайте задачи на Python, C++ или Java"}
          </p>
        </div>
        {role === "organizer" && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Добавить задачу
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Загрузка…
        </div>
      ) : problems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground gap-3">
            <Code2 className="h-12 w-12 opacity-30" />
            <p className="text-lg">Задач пока нет</p>
            {role === "organizer" && (
              <Button variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" /> Создать первую задачу
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {problems.map((p) => (
            <Link key={p.id} to={`/algo/${p.id}`} className="block group">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{p.id}</span>
                      <span className="font-semibold group-hover:text-primary transition-colors truncate">
                        {p.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {p.time_limit_ms} мс
                      </span>
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> {p.memory_limit_mb} МБ
                      </span>
                      <span>{p.test_count} тест{p.test_count === 1 ? "" : p.test_count < 5 ? "а" : "ов"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.my_best_verdict && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${VERDICT_COLORS[p.my_best_verdict] || VERDICT_COLORS.pending}`}>
                        {p.my_best_verdict}
                      </span>
                    )}
                    {role === "organizer" && (
                      <button
                        onClick={(e) => handleDelete(p.id, e)}
                        className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create problem dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Новая задача</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Название</label>
              <Input
                placeholder="Например: Сумма двух чисел"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Условие задачи (Markdown)</label>
              <Textarea
                rows={6}
                placeholder="## Условие&#10;&#10;Дано два числа A и B. Выведите их сумму.&#10;&#10;## Входные данные&#10;Два числа A и B (1 ≤ A, B ≤ 10⁹).&#10;&#10;## Выходные данные&#10;Одно число — сумма A+B."
                value={form.statement}
                onChange={e => setForm(f => ({ ...f, statement: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Лимит времени (мс)</label>
                <Input
                  type="number"
                  min={100}
                  max={10000}
                  value={form.time_limit_ms}
                  onChange={e => setForm(f => ({ ...f, time_limit_ms: +e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Лимит памяти (МБ)</label>
                <Input
                  type="number"
                  min={32}
                  max={1024}
                  value={form.memory_limit_mb}
                  onChange={e => setForm(f => ({ ...f, memory_limit_mb: +e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Создать и добавить тесты
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

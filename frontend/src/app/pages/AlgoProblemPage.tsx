import React, { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import {
  ArrowLeft, Clock, Cpu, Send, Plus, Trash2, Loader2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { toast } from "sonner"

interface TestCase { id: number; input_data: string; expected_output: string; is_sample: boolean }
interface Problem {
  id: number; title: string; statement: string
  time_limit_ms: number; memory_limit_mb: number
  created_at: string; test_cases: TestCase[]
}
interface Submission {
  id: number; problem_id: number; user_id: number
  language: string; source_code: string
  verdict: string; score: number
  time_ms: number | null; error_message: string | null
  test_results: { test_id: number; verdict: string; time_ms: number | null }[] | null
  submitted_at: string
}

const VERDICT_META: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  OK:      { color: "text-green-600",  label: "Принято",          icon: <CheckCircle2 className="h-4 w-4" /> },
  WA:      { color: "text-red-600",    label: "Неверный ответ",   icon: <XCircle className="h-4 w-4" /> },
  TL:      { color: "text-yellow-600", label: "Превышен лимит времени", icon: <Clock className="h-4 w-4" /> },
  ML:      { color: "text-orange-600", label: "Превышен лимит памяти",  icon: <AlertCircle className="h-4 w-4" /> },
  RE:      { color: "text-purple-600", label: "Ошибка времени выполнения", icon: <XCircle className="h-4 w-4" /> },
  CE:      { color: "text-slate-500",  label: "Ошибка компиляции", icon: <XCircle className="h-4 w-4" /> },
  pending: { color: "text-muted-foreground", label: "В очереди",  icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  running: { color: "text-blue-600",   label: "Выполняется",       icon: <Loader2 className="h-4 w-4 animate-spin" /> },
}

const STARTER: Record<string, string> = {
  python: "import sys\ninput = sys.stdin.readline\n\n# Ваше решение здесь\n",
  cpp:    '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Ваше решение здесь\n    return 0;\n}\n',
  java:   'import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n        // Ваше решение здесь\n    }\n}\n',
}

export function AlgoProblemPage() {
  const { id } = useParams<{ id: string }>()
  const { role } = useAuth()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [lang, setLang] = useState<"python" | "cpp" | "java">("python")
  const [code, setCode] = useState(STARTER.python)
  const [submitting, setSubmitting] = useState(false)
  const [loadingProb, setLoadingProb] = useState(true)
  const [expandedSub, setExpandedSub] = useState<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Test case management (organizer)
  const [newTest, setNewTest] = useState({ input_data: "", expected_output: "", is_sample: false })
  const [addingTest, setAddingTest] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Problem>(`/algo/problems/${id}`),
      api.get<Submission[]>(`/algo/problems/${id}/submissions`),
    ]).then(([p, s]) => {
      setProblem(p)
      setSubmissions(s)
    }).catch(() => toast.error("Не удалось загрузить задачу"))
      .finally(() => setLoadingProb(false))
  }, [id])

  // Poll running submissions
  useEffect(() => {
    const running = submissions.some(s => s.verdict === "pending" || s.verdict === "running")
    if (running && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const fresh = await api.get<Submission[]>(`/algo/problems/${id}/submissions`).catch(() => null)
        if (fresh) {
          setSubmissions(fresh)
          const stillRunning = fresh.some(s => s.verdict === "pending" || s.verdict === "running")
          if (!stillRunning && pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        }
      }, 2000)
    }
    return () => {
      if (!running && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [submissions, id])

  const handleLangChange = (l: "python" | "cpp" | "java") => {
    setLang(l)
    setCode(STARTER[l])
  }

  const handleSubmit = async () => {
    if (!code.trim()) { toast.error("Введите код решения"); return }
    setSubmitting(true)
    try {
      const sub = await api.post<Submission>(`/algo/problems/${id}/submit`, { language: lang, source_code: code })
      setSubmissions(prev => [sub, ...prev])
      toast.success("Решение отправлено!")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddTest = async () => {
    if (!newTest.input_data.trim() || !newTest.expected_output.trim()) {
      toast.error("Заполните входные и выходные данные")
      return
    }
    setAddingTest(true)
    try {
      const tc = await api.post<TestCase>(`/algo/problems/${id}/tests`, newTest)
      setProblem(p => p ? { ...p, test_cases: [...p.test_cases, tc] } : p)
      setNewTest({ input_data: "", expected_output: "", is_sample: false })
      toast.success("Тест добавлен")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAddingTest(false)
    }
  }

  const handleDeleteTest = async (testId: number) => {
    if (!confirm("Удалить тест?")) return
    try {
      await api.delete(`/algo/problems/${id}/tests/${testId}`)
      setProblem(p => p ? { ...p, test_cases: p.test_cases.filter(t => t.id !== testId) } : p)
      toast.success("Тест удалён")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loadingProb) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Загрузка…
      </div>
    )
  }
  if (!problem) {
    return <div className="text-center text-muted-foreground py-20">Задача не найдена</div>
  }

  const sampleTests = problem.test_cases.filter(t => t.is_sample)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/algo" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {problem.time_limit_ms} мс</span>
            <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> {problem.memory_limit_mb} МБ</span>
            <span>{problem.test_cases.length} тестов</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: statement + samples */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Условие</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                {problem.statement}
              </pre>
            </CardContent>
          </Card>

          {sampleTests.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Примеры</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sampleTests.map((t, i) => (
                  <div key={t.id} className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Вход {i + 1}</p>
                      <pre className="bg-muted rounded p-2 text-xs font-mono">{t.input_data}</pre>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Выход {i + 1}</p>
                      <pre className="bg-muted rounded p-2 text-xs font-mono">{t.expected_output}</pre>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: editor + submissions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Решение</CardTitle>
                <div className="flex gap-1">
                  {(["python", "cpp", "java"] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => handleLangChange(l)}
                      className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                        lang === l
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {l === "cpp" ? "C++" : l === "java" ? "Java" : "Python"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                rows={16}
                className="font-mono text-sm resize-y"
                placeholder="Введите ваше решение..."
                spellCheck={false}
              />
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Отправка…</>
                  : <><Send className="h-4 w-4 mr-2" />Отправить решение</>}
              </Button>
            </CardContent>
          </Card>

          {/* Submissions history */}
          {submissions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Мои попытки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {submissions.map(sub => {
                  const meta = VERDICT_META[sub.verdict] || VERDICT_META.pending
                  const expanded = expandedSub === sub.id
                  return (
                    <div key={sub.id} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSub(expanded ? null : sub.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className={`flex items-center gap-1.5 font-bold text-sm ${meta.color}`}>
                          {meta.icon} {sub.verdict}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{sub.language}</span>
                        {sub.time_ms && (
                          <span className="text-xs text-muted-foreground">{sub.time_ms} мс</span>
                        )}
                        {sub.verdict === "OK" && (
                          <span className="text-xs text-green-600 font-medium">{sub.score}%</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(sub.submitted_at).toLocaleTimeString("ru")}
                        </span>
                        {expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                      {expanded && (
                        <div className="border-t px-3 py-2 bg-muted/30 space-y-2">
                          {sub.error_message && (
                            <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono bg-red-50 dark:bg-red-950/30 rounded p-2">
                              {sub.error_message}
                            </pre>
                          )}
                          {sub.test_results && (
                            <div className="flex flex-wrap gap-1">
                              {sub.test_results.map((tr, i) => (
                                <span
                                  key={i}
                                  title={`Тест ${i + 1}: ${tr.verdict}${tr.time_ms ? ` (${tr.time_ms} мс)` : ""}`}
                                  className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${
                                    tr.verdict === "OK"
                                      ? "bg-green-500 text-white"
                                      : "bg-red-500 text-white"
                                  }`}
                                >
                                  {tr.verdict === "OK" ? "✓" : "✗"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Organizer: test management */}
      {role === "organizer" && (
        <Card>
          <CardHeader>
            <CardTitle>Тесты ({problem.test_cases.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {problem.test_cases.map((tc, i) => (
                <div key={tc.id} className="flex items-start gap-2 p-2 rounded border bg-muted/20">
                  <span className="text-xs text-muted-foreground w-6 shrink-0 mt-1">#{i + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                    <pre className="text-xs font-mono bg-background rounded p-2 overflow-auto max-h-20">{tc.input_data}</pre>
                    <pre className="text-xs font-mono bg-background rounded p-2 overflow-auto max-h-20">{tc.expected_output}</pre>
                  </div>
                  {tc.is_sample && (
                    <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 shrink-0">пример</span>
                  )}
                  <button
                    onClick={() => handleDeleteTest(tc.id)}
                    className="p-1 hover:text-destructive text-muted-foreground transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 space-y-3 bg-muted/10">
              <p className="text-sm font-medium">Добавить тест</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Входные данные</label>
                  <Textarea
                    rows={3}
                    className="font-mono text-sm"
                    placeholder="3 5"
                    value={newTest.input_data}
                    onChange={e => setNewTest(t => ({ ...t, input_data: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Ожидаемый выход</label>
                  <Textarea
                    rows={3}
                    className="font-mono text-sm"
                    placeholder="8"
                    value={newTest.expected_output}
                    onChange={e => setNewTest(t => ({ ...t, expected_output: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTest.is_sample}
                    onChange={e => setNewTest(t => ({ ...t, is_sample: e.target.checked }))}
                    className="rounded"
                  />
                  Показывать как пример участникам
                </label>
                <Button size="sm" onClick={handleAddTest} disabled={addingTest} className="ml-auto">
                  {addingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                  Добавить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

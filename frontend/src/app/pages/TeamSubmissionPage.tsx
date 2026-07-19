import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import {
  Github, FileText, MonitorPlay, Presentation, UploadCloud,
  CheckCircle2, AlertCircle, File, Loader2, RefreshCw,
  Archive, Link as LinkIcon, FileVideo,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { api } from "../lib/api"
import { toast } from "sonner"

interface Submission {
  id: number; team_id: number
  repo_url: string | null; archive_filename: string | null
  docs_filename: string | null; presentation_filename: string | null
  screencast_filename: string | null; screencast_url: string | null
  transcript: string | null
}
interface CheckResult {
  id: number; check_type: string; status: string; score: number
  details: Record<string, any> | null; checked_at: string | null
}

export function TeamSubmissionPage() {
  const [activeTab, setActiveTab] = useState("code")
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [loading, setLoading] = useState(true)
  const [repoUrl, setRepoUrl] = useState("")
  const [screencastUrl, setScreencastUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const [sub, chks] = await Promise.all([
        api.get<Submission>("/submissions"),
        api.get<CheckResult[]>("/submissions/checks"),
      ])
      setSubmission(sub)
      setRepoUrl(sub.repo_url ?? "")
      setScreencastUrl(sub.screencast_url ?? "")
      setChecks(chks)
    } catch { /* not in team */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const hasRunning = checks.some(c => c.status === "running" || c.status === "pending")
    if (!hasRunning) return
    const id = setInterval(async () => {
      const chks = await api.get<CheckResult[]>("/submissions/checks").catch(() => [] as CheckResult[])
      setChecks(chks)
    }, 3000)
    return () => clearInterval(id)
  }, [checks])

  const getCheck = (type: string) => checks.find(c => c.check_type === type)

  const saveRepo = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSaving(true)
    try { await api.put<Submission>("/submissions/code", { repo_url: repoUrl }); await load() }
    catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const uploadArchive = async (file: File) => {
    const form = new FormData(); form.append("file", file)
    setError(null); setUploading(true)
    try { await api.upload<Submission>("/submissions/code/archive", form); await load(); toast.success("Архив загружен") }
    catch (err: any) { setError(err.message) }
    finally { setUploading(false) }
  }

  const uploadFile = async (path: string, file: File) => {
    const form = new FormData(); form.append("file", file)
    setError(null); setUploading(true)
    try { await api.upload<Submission>(`/submissions/${path}`, form); await load() }
    catch (err: any) { setError(err.message) }
    finally { setUploading(false) }
  }

  const saveScreencastUrl = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSaving(true)
    try { await api.put<Submission>("/submissions/screencast/url", { url: screencastUrl }); await load(); toast.success("URL сохранён") }
    catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const tabs = [
    { id: "code", label: "Исходный код", icon: Github },
    { id: "docs", label: "Документация", icon: FileText },
    { id: "presentation", label: "Презентация", icon: Presentation },
    { id: "screencast", label: "Скринкаст", icon: MonitorPlay },
  ]

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Заявка команды</h1>
          <p className="text-muted-foreground mt-1">Управляйте артефактами вашего решения.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Обновить</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          {tabs.map(tab => {
            const check = getCheck(tab.id)
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-card hover:bg-muted text-foreground border"}`}>
                <div className="flex items-center">
                  <tab.icon className={`h-4 w-4 mr-2 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  {tab.label}
                </div>
                {check?.status === "passed" && <CheckCircle2 className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-green-500"}`} />}
                {check?.status === "failed" && <AlertCircle className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-red-500"}`} />}
                {check?.status === "running" && <Loader2 className={`h-4 w-4 shrink-0 animate-spin ${isActive ? "text-white" : "text-primary"}`} />}
              </button>
            )
          })}
        </div>

        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>

              {/* ── Code tab ── */}
              {activeTab === "code" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><Github className="h-5 w-5 mr-2" />Репозиторий с кодом</CardTitle>
                    <CardDescription>Укажите GitHub URL или загрузите ZIP-архив проекта.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Tabs defaultValue={submission?.archive_filename ? "archive" : "git"}>
                      <TabsList className="w-full">
                        <TabsTrigger value="git" className="flex-1"><Github className="h-3.5 w-3.5 mr-1.5" />Git-репозиторий</TabsTrigger>
                        <TabsTrigger value="archive" className="flex-1"><Archive className="h-3.5 w-3.5 mr-1.5" />ZIP-архив</TabsTrigger>
                      </TabsList>
                      <TabsContent value="git" className="pt-4">
                        <form onSubmit={saveRepo} className="space-y-2">
                          <label className="text-sm font-medium">Ссылка на GitHub-репозиторий</label>
                          <div className="flex space-x-2">
                            <Input placeholder="https://github.com/team/repo" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}</Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Репозиторий должен быть публичным</p>
                        </form>
                      </TabsContent>
                      <TabsContent value="archive" className="pt-4">
                        <FileUploadZone
                          filename={submission?.archive_filename}
                          accept=".zip"
                          uploading={uploading}
                          label="ZIP-архив проекта (максимум 100 МБ)"
                          onFileSelect={uploadArchive}
                        />
                      </TabsContent>
                    </Tabs>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <CheckResultPanel check={getCheck("code")} />
                  </CardContent>
                </Card>
              )}

              {/* ── Docs tab ── */}
              {activeTab === "docs" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><FileText className="h-5 w-5 mr-2" />Документация проекта</CardTitle>
                    <CardDescription>PDF, DOCX или Markdown. Проверим наличие обязательных разделов.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FileUploadZone filename={submission?.docs_filename} accept=".pdf,.docx,.md" uploading={uploading} onFileSelect={f => uploadFile("docs", f)} />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <CheckResultPanel check={getCheck("docs")} />
                  </CardContent>
                </Card>
              )}

              {/* ── Presentation tab ── */}
              {activeTab === "presentation" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><Presentation className="h-5 w-5 mr-2" />Презентация (Demo Day)</CardTitle>
                    <CardDescription>PPTX или PDF. Проверим количество слайдов и ключевые темы.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FileUploadZone filename={submission?.presentation_filename} accept=".pptx,.pdf" uploading={uploading} onFileSelect={f => uploadFile("presentation", f)} />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <CheckResultPanel check={getCheck("presentation")} />
                  </CardContent>
                </Card>
              )}

              {/* ── Screencast tab ── */}
              {activeTab === "screencast" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center"><MonitorPlay className="h-5 w-5 mr-2" />Скринкаст решения</CardTitle>
                    <CardDescription>Загрузите видеофайл или укажите ссылку на YouTube / Vimeo.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Tabs defaultValue={submission?.screencast_url ? "url" : "file"}>
                      <TabsList className="w-full">
                        <TabsTrigger value="file" className="flex-1"><FileVideo className="h-3.5 w-3.5 mr-1.5" />Файл</TabsTrigger>
                        <TabsTrigger value="url" className="flex-1"><LinkIcon className="h-3.5 w-3.5 mr-1.5" />Ссылка</TabsTrigger>
                      </TabsList>
                      <TabsContent value="file" className="pt-4">
                        <FileUploadZone
                          filename={submission?.screencast_filename}
                          accept=".mp4,.avi,.mov,.mkv,.webm"
                          uploading={uploading}
                          label="MP4, MOV, MKV · длительность 3–5 мин · ≥ 720p"
                          onFileSelect={f => uploadFile("screencast", f)}
                        />
                      </TabsContent>
                      <TabsContent value="url" className="pt-4 space-y-3">
                        <form onSubmit={saveScreencastUrl} className="space-y-2">
                          <label className="text-sm font-medium">Ссылка на видео</label>
                          <div className="flex space-x-2">
                            <Input
                              placeholder="https://youtube.com/watch?v=... или https://vimeo.com/..."
                              value={screencastUrl}
                              onChange={e => setScreencastUrl(e.target.value)}
                            />
                            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}</Button>
                          </div>
                        </form>
                        {submission?.screencast_url && (
                          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/20 text-sm">
                            <LinkIcon className="h-4 w-4 text-blue-500 shrink-0" />
                            <a href={submission.screencast_url} target="_blank" rel="noreferrer"
                              className="text-primary hover:underline truncate">{submission.screencast_url}</a>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>

                    {/* Transcript */}
                    {submission?.transcript && (
                      <div className="border rounded-lg p-3 bg-muted/20">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Автотранскрипция</p>
                        <p className="text-sm leading-relaxed line-clamp-4">{submission.transcript}</p>
                      </div>
                    )}

                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <CheckResultPanel check={getCheck("screencast")} />
                  </CardContent>
                </Card>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── FileUploadZone ─────────────────────────────────────────────────────────────

function FileUploadZone({
  filename, accept, uploading, label, onFileSelect,
}: {
  filename?: string | null; accept: string; uploading: boolean
  label?: string; onFileSelect: (file: File) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Drag-drop bypasses the <input accept> filter, so validate the extension here.
  const exts = accept.split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
  const isAccepted = (f: File) =>
    exts.length === 0 || exts.some(ext => f.name.toLowerCase().endsWith(ext))

  const pick = (f: File | undefined | null) => {
    if (!f) return
    if (!isAccepted(f)) {
      toast.error(`Неподходящий формат. Разрешено: ${accept}`)
      return
    }
    onFileSelect(f)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pick(e.target.files?.[0]); e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (uploading) return
    pick(e.dataTransfer.files?.[0])
  }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if (!uploading) setDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false) }

  if (filename) return (
    <div
      className={`border rounded-xl p-4 flex items-center justify-between transition-colors ${
        dragOver ? "border-primary bg-primary/10 border-dashed" : "bg-muted/20"
      }`}
      onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
          <File className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{dragOver ? "Отпустите, чтобы заменить" : filename}</p>
          <p className="text-xs text-muted-foreground">Загружено · перетащите новый файл для замены</p>
        </div>
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Заменить"}
      </Button>
    </div>
  )

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center text-center transition-colors cursor-pointer ${
        dragOver ? "border-primary bg-primary/10 scale-[1.01]" : "hover:bg-primary/5 hover:border-primary/50"
      }`}
      onClick={() => ref.current?.click()}
      onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
    >
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        {uploading ? <Loader2 className="h-6 w-6 text-primary animate-spin" /> : <UploadCloud className="h-6 w-6 text-primary" />}
      </div>
      <p className="font-medium">
        {uploading ? "Загрузка…" : dragOver ? "Отпустите файл" : "Нажмите или перетащите файл"}
      </p>
      {label && <p className="text-xs text-muted-foreground mt-1">{label}</p>}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  )
}

// ── CheckResultPanel ───────────────────────────────────────────────────────────

function CheckResultPanel({ check }: { check: CheckResult | undefined }) {
  if (!check) return null
  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Результат автопроверки</h4>
        <div className="flex items-center gap-2">
          {check.status === "running" && <Badge variant="outline" className="text-blue-600 border-blue-200"><Loader2 className="h-3 w-3 animate-spin mr-1" />Проверяется…</Badge>}
          {check.status === "passed" && <Badge className="bg-green-100 text-green-700 border-green-200">Пройдено ✓</Badge>}
          {check.status === "failed" && <Badge variant="destructive">Не пройдено</Badge>}
          {check.status !== "running" && <span className="text-sm font-bold">{check.score} баллов</span>}
        </div>
      </div>
      {check.details && check.status !== "running" && (
        <CheckDetails type={check.check_type} details={check.details} />
      )}
    </div>
  )
}

function CheckDetails({ type, details }: { type: string; details: Record<string, any> }) {
  if (type === "code") {
    const c = details.checks ?? {}
    const warnings: string[] = details.warnings ?? []
    return (
      <div className="space-y-1.5">
        <CheckItem label="README.md найден" passed={!!c.has_readme} />
        <CheckItem label="Лицензия найдена" passed={!!c.has_license} />
        <CheckItem label={c.dependency_file ? `Файл зависимостей: ${c.dependency_file}` : "Файл зависимостей не найден"} passed={!!c.has_dependency_file} />
        <CheckItem label={c.run_instruction_file ? `Инструкция запуска: ${c.run_instruction_file}` : "Инструкция по запуску отсутствует"} passed={!!c.has_run_instructions} />
        <CheckItem label=".gitignore найден" passed={!!c.has_gitignore} />
        {c.commit_count !== undefined && <CheckItem label={`Коммитов: ${c.commit_count}`} passed={c.commit_count >= 3} />}
        {c.loc !== undefined && <CheckItem label={`Строк кода (LOC): ${c.loc}`} passed={c.loc > 50} />}
        {c.flake8_errors !== undefined && <CheckItem label={`Ошибки flake8: ${c.flake8_errors}`} passed={c.flake8_errors === 0} />}
        {c.test_runner && <CheckItem label={`Тесты (${c.test_runner}): пройдено ${c.tests_passed ?? 0}, провалено ${c.tests_failed ?? 0}`} passed={(c.tests_failed ?? 0) === 0 && (c.tests_passed ?? 0) > 0} />}
        {c.secrets_found > 0 && <CheckItem label={`Обнаружено подозрительных мест: ${c.secrets_found}`} passed={false} />}
        {warnings.map((w, i) => (
          <p key={i} className="text-xs text-yellow-600 pl-6">⚠ {w}</p>
        ))}
        {details.error && <p className="text-xs text-destructive">{details.error}</p>}
      </div>
    )
  }
  if (type === "docs") {
    const found: string[] = details.found_sections ?? []
    const missing: string[] = details.missing_sections ?? []
    // Render the actual sections the backend evaluated (works for the built-in
    // checklist and organizer-defined ones), de-duplicated and order-stable.
    const sections = [...found, ...missing.filter(s => !found.includes(s))]
    return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Слов в документе: {details.word_count}</p>
      {sections.map(s => (
        <CheckItem key={s} label={`Раздел «${s}»`} passed={found.includes(s)} />
      ))}
      <CheckItem
        label={details.image_count > 0 ? `Изображения/схемы: ${details.image_count}` : "Изображения/схемы отсутствуют"}
        passed={!!details.has_images}
      />
    </div>
    )
  }
  if (type === "presentation") return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Слайдов: {details.slide_count} (минимум {details.min_slides})</p>
      {["проблема", "решение", "аудитория", "стек", "демо", "команда", "контакты"].map(t => (
        <CheckItem key={t} label={`Тема «${t}»`} passed={(details.found_topics ?? []).includes(t)} />
      ))}
    </div>
  )
  if (type === "screencast") return (
    <div className="space-y-1.5">
      {details.note ? (
        <p className="text-xs text-muted-foreground">{details.note}</p>
      ) : (
        <>
          <CheckItem label={`Длительность ${details.duration_sec}с (3–5 мин)`} passed={details.duration_sec >= 180 && details.duration_sec <= 300} />
          <CheckItem label={`Разрешение ${details.width}×${details.height}`} passed={details.height >= 720} />
          <CheckItem label={`Кодек: ${details.codec}`} passed={["h264","h265","hevc","vp9","av1"].includes(details.codec)} />
          {details.has_audio !== undefined && <CheckItem label="Аудиодорожка присутствует" passed={!!details.has_audio} />}
          {details.summary && (
            <div className="mt-2 p-2 rounded bg-background border text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Саммари: </span>{details.summary}
            </div>
          )}
        </>
      )}
    </div>
  )
  return null
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {passed
        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
        : <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />}
      <p className={`text-sm ${passed ? "text-foreground" : "text-red-500"}`}>{label}</p>
    </div>
  )
}

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Briefcase, SlidersHorizontal, Plus, Trash2, Edit2, Loader2, Scale, ListChecks, FileText, Presentation } from "lucide-react"
import { api } from "../lib/api"
import { toast } from "sonner"

interface Case { id: number; slug: string; title: string; description: string | null; sponsor: string | null }
interface Criterion { id: number; name: string; description: string | null; weight: number; max_score: number; position: number }
interface ChecklistItem { id: number; kind: string; keyword: string; label: string; position: number }

export function ManagePage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Управление хакатоном</h1>
        <p className="text-muted-foreground mt-1">Настройте кейсы, критерии оценки и обязательные разделы артефактов.</p>
      </div>

      <Tabs defaultValue="cases">
        <TabsList>
          <TabsTrigger value="cases"><Briefcase className="h-4 w-4 mr-2" />Кейсы</TabsTrigger>
          <TabsTrigger value="criteria"><SlidersHorizontal className="h-4 w-4 mr-2" />Критерии оценки</TabsTrigger>
          <TabsTrigger value="checklist"><ListChecks className="h-4 w-4 mr-2" />Разделы артефактов</TabsTrigger>
        </TabsList>
        <TabsContent value="cases" className="pt-4"><CasesManager /></TabsContent>
        <TabsContent value="criteria" className="pt-4"><CriteriaManager /></TabsContent>
        <TabsContent value="checklist" className="pt-4"><ChecklistManager /></TabsContent>
      </Tabs>
    </div>
  )
}

// ── Cases ────────────────────────────────────────────────────────────────────

function CasesManager() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Case> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<Case[]>("/cases").then(setCases).catch(() => toast.error("Ошибка загрузки кейсов")).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing?.slug?.trim() || !editing?.title?.trim()) { toast.error("Заполните slug и название"); return }
    setSaving(true)
    try {
      if (editing.id) {
        await api.put(`/cases/${editing.id}`, editing)
        toast.success("Кейс обновлён")
      } else {
        await api.post("/cases", editing)
        toast.success("Кейс создан")
      }
      setEditing(null); load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm("Удалить кейс?")) return
    try { await api.delete(`/cases/${id}`); setCases(c => c.filter(x => x.id !== id)); toast.success("Удалено") }
    catch (e: any) { toast.error(e.message) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ slug: "", title: "", description: "", sponsor: "" })}>
          <Plus className="h-4 w-4 mr-2" />Добавить кейс
        </Button>
      </div>

      {cases.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Кейсов пока нет</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {cases.map(c => (
            <Card key={c.id}>
              <CardContent className="flex items-start justify-between py-4 gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{c.title}</span>
                    <span className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">{c.slug}</span>
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                  {c.sponsor && <p className="text-xs text-muted-foreground mt-1">Спонсор: {c.sponsor}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(c)} className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => remove(c.id)} className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editing?.id ? "Редактировать кейс" : "Новый кейс"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Slug (идентификатор)</label>
                  <Input value={editing.slug ?? ""} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="fintech" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Спонсор</label>
                  <Input value={editing.sponsor ?? ""} onChange={e => setEditing({ ...editing, sponsor: e.target.value })} placeholder="Сбер" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Название</label>
                <Input value={editing.title ?? ""} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Финтех: автоматизация скоринга" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Описание</label>
                <Textarea rows={3} value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
                <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Сохранить</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Checklist (required sections) ─────────────────────────────────────────────

const KIND_META: Record<string, { title: string; hint: string; icon: any }> = {
  docs: { title: "Разделы документации", hint: "Проверяются в загруженной документации (PDF/DOCX/MD).", icon: FileText },
  presentation: { title: "Разделы презентации", hint: "Проверяются в слайдах презентации (PPTX/PDF).", icon: Presentation },
}

function ChecklistManager() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<ChecklistItem> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<ChecklistItem[]>("/checklist").then(setItems).catch(() => toast.error("Ошибка загрузки")).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing?.label?.trim() || !editing?.keyword?.trim()) { toast.error("Заполните название и ключевое слово"); return }
    setSaving(true)
    try {
      const body = {
        kind: editing.kind ?? "docs",
        keyword: editing.keyword,
        label: editing.label,
        position: editing.position ?? items.filter(i => i.kind === editing.kind).length,
      }
      if (editing.id) { await api.put(`/checklist/${editing.id}`, body); toast.success("Раздел обновлён") }
      else { await api.post("/checklist", body); toast.success("Раздел добавлен") }
      setEditing(null); load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm("Удалить раздел?")) return
    try { await api.delete(`/checklist/${id}`); setItems(c => c.filter(x => x.id !== id)); toast.success("Удалено") }
    catch (e: any) { toast.error(e.message) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardContent className="py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <ListChecks className="h-4 w-4 shrink-0" />
          Автопроверка ищет эти разделы по ключевому слову в тексте артефакта. Изменения применяются к новым проверкам.
        </CardContent>
      </Card>

      {(["docs", "presentation"] as const).map(kind => {
        const meta = KIND_META[kind]
        const Icon = meta.icon
        const group = items.filter(i => i.kind === kind)
        return (
          <div key={kind} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-semibold">{meta.title}</span>
                <span className="text-xs text-muted-foreground">{meta.hint}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing({ kind, keyword: "", label: "" })}>
                <Plus className="h-4 w-4 mr-1" />Добавить
              </Button>
            </div>
            {group.length === 0 ? (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Разделов нет — используется стандартный набор.</CardContent></Card>
            ) : (
              <div className="grid gap-2">
                {group.map(it => (
                  <Card key={it.id}>
                    <CardContent className="flex items-center justify-between py-3 gap-4">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="font-medium">{it.label}</span>
                        <span className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">«{it.keyword}»</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditing(it)} className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => remove(it.id)} className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editing?.id ? "Редактировать раздел" : "Новый раздел"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Название раздела</label>
                <Input value={editing.label ?? ""} onChange={e => setEditing({ ...editing, label: e.target.value })} placeholder="Инструкция по развёртыванию" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ключевое слово для поиска</label>
                <Input value={editing.keyword ?? ""} onChange={e => setEditing({ ...editing, keyword: e.target.value })} placeholder="развертывание" />
                <p className="text-xs text-muted-foreground">Подстрока (без учёта регистра), которую проверка ищет в тексте артефакта.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
                <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Сохранить</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Criteria ─────────────────────────────────────────────────────────────────

function CriteriaManager() {
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Criterion> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<Criterion[]>("/criteria").then(setCriteria).catch(() => toast.error("Ошибка загрузки")).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Укажите название критерия"); return }
    setSaving(true)
    try {
      const body = {
        name: editing.name,
        description: editing.description ?? "",
        weight: editing.weight ?? 1,
        max_score: editing.max_score ?? 10,
        position: editing.position ?? criteria.length,
      }
      if (editing.id) { await api.put(`/criteria/${editing.id}`, body); toast.success("Критерий обновлён") }
      else { await api.post("/criteria", body); toast.success("Критерий создан") }
      setEditing(null); load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm("Удалить критерий?")) return
    try { await api.delete(`/criteria/${id}`); setCriteria(c => c.filter(x => x.id !== id)); toast.success("Удалено") }
    catch (e: any) { toast.error(e.message) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Scale className="h-4 w-4" />
          Жюри оценивает каждый критерий, итоговый балл считается как взвешенное среднее (0–50).
          Сумма весов: <span className="font-medium text-foreground">{totalWeight.toFixed(1)}</span>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setEditing({ name: "", description: "", weight: 1, max_score: 10 })}>
          <Plus className="h-4 w-4 mr-2" />Добавить критерий
        </Button>
      </div>

      {criteria.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Критериев пока нет. Жюри будет ставить общий балл 0–50.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {criteria.map(c => {
            const pct = totalWeight > 0 ? (c.weight / totalWeight * 100) : 0
            return (
              <Card key={c.id}>
                <CardContent className="flex items-start justify-between py-4 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5">вес {c.weight} · {pct.toFixed(0)}%</span>
                      <span className="text-xs text-muted-foreground">макс. {c.max_score}</span>
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditing(c)} className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => remove(c.id)} className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editing?.id ? "Редактировать критерий" : "Новый критерий"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Название</label>
                <Input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Техническая реализация" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Описание</label>
                <Textarea rows={2} value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Что оценивается по этому критерию" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Вес</label>
                  <Input type="number" min={0.1} step={0.1} value={editing.weight ?? 1} onChange={e => setEditing({ ...editing, weight: +e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Макс. балл</label>
                  <Input type="number" min={1} max={100} value={editing.max_score ?? 10} onChange={e => setEditing({ ...editing, max_score: +e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
                <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Сохранить</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

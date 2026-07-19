import React from "react"
import { motion } from "motion/react"
import { Link } from "react-router"
import { Button } from "../components/ui/button"
import {
  Code2, ShieldCheck, Trophy, ArrowRight, UploadCloud, FileText,
  MonitorPlay, Terminal, SlidersHorizontal, Users, Sparkles, CheckCircle2,
} from "lucide-react"

const FEATURES = [
  { icon: UploadCloud, title: "Анализ кода", desc: "Линтеры, LOC, цикломатическая сложность, поиск секретов и проверка структуры репозитория — мгновенно.", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { icon: FileText, title: "Проверка документов", desc: "Валидация разделов, объёма и наличия схем в PDF, DOCX и Markdown.", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { icon: MonitorPlay, title: "Скринкаст и транскрипция", desc: "Проверка длительности, разрешения, кодека и авто-транскрипция аудио в текст.", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { icon: Terminal, title: "Алгоритмический судья", desc: "Sandbox для Python, C++ и Java с лимитами времени/памяти и вердиктами OK/WA/TL/ML/RE/CE.", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { icon: SlidersHorizontal, title: "Гибкие критерии", desc: "Организатор задаёт критерии и веса, жюри оценивает по каждому — итог считается автоматически.", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { icon: Trophy, title: "Прозрачный рейтинг", desc: "Авто-метрики объединяются с экспертными оценками в честный итоговый рейтинг.", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
]

const ROLES = [
  { icon: Users, title: "Участникам", points: ["Создание и вступление в команды", "Загрузка кода, доков, презентации, скринкаста", "Алгоритмические задачи онлайн"] },
  { icon: ShieldCheck, title: "Жюри", points: ["Полные карточки команд с артефактами", "Оценка по настраиваемым критериям", "Скачивание файлов и просмотр транскрипций"] },
  { icon: SlidersHorizontal, title: "Организаторам", points: ["Управление кейсами и критериями", "Аналитика и экспорт результатов в CSV", "Мониторинг автопроверок в реальном времени"] },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 overflow-x-hidden">
      {/* Nav */}
      <nav className="h-16 flex items-center justify-between px-6 md:px-12 border-b bg-background/80 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="flex items-center">
          <Code2 className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-xl tracking-tight">JUDGE</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" asChild><Link to="/login">Вход</Link></Button>
          <Button asChild className="rounded-full shadow-lg"><Link to="/register">Начать</Link></Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative pt-32 pb-20 px-6 md:px-12">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-indigo-500/20 via-purple-500/5 to-transparent blur-3xl rounded-full" />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-6 bg-muted/50 text-muted-foreground border-border/50 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary mr-2" />
                Платформа автоматической оценки хакатонов
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter max-w-4xl mx-auto leading-[1.05]">
                Оценивайте хакатоны <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">в разы быстрее</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
                Автопроверка кода, документации, презентаций и скринкастов. Алгоритмический судья. Гибкие критерии. Честный рейтинг — всё в одном месте.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" className="rounded-full h-14 px-10 text-lg font-semibold shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 border-0 text-white hover:from-blue-700 hover:to-indigo-700" asChild>
                <Link to="/register">Начать бесплатно <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-14 px-10 text-lg" asChild>
                <Link to="/login">Войти в демо</Link>
              </Button>
            </motion.div>

            {/* Stats strip */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-8 pt-10 text-center">
              {[["6", "типов автопроверок"], ["3", "языка в sandbox"], ["100%", "прозрачность оценок"]].map(([v, l]) => (
                <div key={l}>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">{v}</div>
                  <div className="text-sm text-muted-foreground mt-1">{l}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Features grid */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-28 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="p-7 rounded-3xl border bg-card hover:shadow-lg transition-all hover:-translate-y-1">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-5 ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Roles */}
          <div className="mt-28">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Для каждой роли</h2>
              <p className="text-muted-foreground mt-3 text-lg">Участники, жюри и организаторы — у каждого свой рабочий процесс.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {ROLES.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="p-7 rounded-3xl border bg-card">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-4">{r.title}</h3>
                  <ul className="space-y-2.5">
                    {r.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{p}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-28 rounded-3xl border bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-center text-white relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10"><Trophy className="h-48 w-48" /></div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight relative z-10">Готовы запустить хакатон?</h2>
            <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto relative z-10">Зарегистрируйтесь и оцените первую команду уже через минуту.</p>
            <Button size="lg" className="mt-8 rounded-full h-14 px-10 text-lg font-semibold bg-white text-indigo-700 hover:bg-white/90 relative z-10" asChild>
              <Link to="/register">Создать аккаунт <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </motion.div>
        </div>

        <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t text-center text-sm text-muted-foreground">
          JUDGE — платформа автоматической оценки хакатонов · {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  )
}

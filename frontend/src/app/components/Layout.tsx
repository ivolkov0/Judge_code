import React, { useState, useEffect } from "react"
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router"
import {
  LayoutDashboard, Users, Trophy, LogOut, Code2, Settings, Bell, Sun, Moon,
  CheckCircle2, AlertCircle, UploadCloud, Terminal, SlidersHorizontal, Star,
  Menu, X, PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useTheme } from "next-themes"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import { ProfileMenu } from "./ProfileMenu"
import { CommandPalette, CommandTrigger } from "./CommandPalette"

interface Notification {
  type: string; status: string; title: string; detail: string; score: number; at: string | null
}

function timeAgo(iso: string | null): string {
  if (!iso) return ""
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "только что"
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} дн назад`
}

const ROLE_LABEL = (r: string | null) =>
  r === "organizer" ? "Организатор" : r === "jury" ? "Жюри" : "Участник"

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { role, user, logout, loading } = useAuth()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [showCmd, setShowCmd] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("judge_sidebar_collapsed") === "1")
  const [notifications, setNotifications] = useState<Notification[]>([])

  const canSeeNotifications = role === "organizer" || role === "jury"

  const toggleCollapsed = () => setCollapsed((c) => { localStorage.setItem("judge_sidebar_collapsed", c ? "0" : "1"); return !c })

  useEffect(() => {
    if (!canSeeNotifications) return
    const fetchNotifs = () => api.get<Notification[]>("/analytics/notifications").then(setNotifications).catch(() => {})
    fetchNotifs()
    const id = setInterval(fetchNotifs, 15000)
    return () => clearInterval(id)
  }, [canSeeNotifications])

  // Global ⌘K / Ctrl+K to open the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); setShowCmd((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const navConfig = {
    organizer: [
      { name: "Главная", href: "/dashboard", icon: LayoutDashboard },
      { name: "Команды", href: "/teams", icon: Users },
      { name: "Управление", href: "/manage", icon: SlidersHorizontal },
      { name: "Задачи", href: "/algo", icon: Terminal },
      { name: "Рейтинг", href: "/leaderboard", icon: Trophy },
      { name: "Настройки", href: "/settings", icon: Settings },
    ],
    jury: [
      { name: "Панель жюри", href: "/dashboard", icon: LayoutDashboard },
      { name: "Задачи", href: "/algo", icon: Terminal },
      { name: "Рейтинг", href: "/leaderboard", icon: Trophy },
      { name: "Настройки", href: "/settings", icon: Settings },
    ],
    participant: [
      { name: "Главная", href: "/dashboard", icon: LayoutDashboard },
      { name: "Моя Команда", href: "/team", icon: Users },
      { name: "Решение", href: "/submission", icon: UploadCloud },
      { name: "Задачи", href: "/algo", icon: Terminal },
      { name: "Рейтинг", href: "/leaderboard", icon: Trophy },
      { name: "Настройки", href: "/settings", icon: Settings },
    ],
  }

  const navItems = navConfig[role || "participant"] || navConfig.participant

  const handleLogout = () => { logout(); navigate("/") }

  const isActive = (href: string) =>
    location.pathname === href || (href !== "/" && location.pathname.startsWith(href + "/"))

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Загрузка…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  const initials = user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : "JU"

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <CommandPalette open={showCmd} onOpenChange={setShowCmd} />

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {showMobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setShowMobileNav(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar backdrop-blur-xl border-r z-50 flex flex-col md:hidden"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b shrink-0">
                <Brand />
                <button onClick={() => setShowMobileNav(false)} className="p-2 -mr-2 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scroll-slim">
                <p className="mb-4 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{ROLE_LABEL(role)}</p>
                {navItems.map((item) => (
                  <Link key={item.name} to={item.href} onClick={() => setShowMobileNav(false)}
                    className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive(item.href) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}>
                    <item.icon className="h-5 w-5 mr-3" />{item.name}
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t shrink-0">
                <button onClick={() => { setShowMobileNav(false); handleLogout() }}
                  className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg">
                  <LogOut className="h-5 w-5 mr-3" />Выйти
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar (collapsible) */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 256 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="border-r bg-sidebar backdrop-blur-xl flex-col hidden md:flex overflow-hidden shrink-0"
      >
        <div className={`h-16 flex items-center border-b shrink-0 ${collapsed ? "justify-center px-0" : "px-6"}`}>
          {collapsed ? <Code2 className="h-6 w-6 text-primary" /> : <Brand />}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scroll-slim">
          {!collapsed && (
            <p className="mb-4 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{ROLE_LABEL(role)}</p>
          )}
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link key={item.name} to={item.href} title={collapsed ? item.name : undefined}
                className={`group relative flex items-center rounded-xl text-sm font-medium transition-colors ${
                  collapsed ? "justify-center h-11 w-11 mx-auto" : "px-3 py-2.5"
                } ${active ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                {active && (
                  <motion.div layoutId="active-nav" className="absolute inset-0 bg-primary/15 rounded-xl ring-1 ring-primary/20"
                    initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                )}
                <item.icon className={`h-5 w-5 relative z-10 ${collapsed ? "" : "mr-3"}`} />
                {!collapsed && <span className="relative z-10">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t shrink-0 space-y-1">
          <button onClick={toggleCollapsed} title={collapsed ? "Развернуть" : "Свернуть"}
            className={`flex items-center rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${collapsed ? "justify-center h-11 w-11 mx-auto" : "w-full px-3 py-2.5"}`}>
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="h-5 w-5 mr-3" />Свернуть</>}
          </button>
          <button onClick={handleLogout} title={collapsed ? "Выйти" : undefined}
            className={`flex items-center rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ${collapsed ? "justify-center h-11 w-11 mx-auto" : "w-full px-3 py-2.5"}`}>
            <LogOut className={`h-5 w-5 ${collapsed ? "" : "mr-3"}`} />{!collapsed && "Выйти"}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/70 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 z-20 shrink-0 sticky top-0">
          <div className="flex items-center md:hidden">
            <button onClick={() => setShowMobileNav(true)} className="p-2 -ml-2 mr-1 rounded-lg hover:bg-muted text-foreground transition-colors" aria-label="Открыть меню">
              <Menu className="h-5 w-5" />
            </button>
            <Brand />
          </div>

          <div className="flex-1 md:hidden" />
          <div className="hidden md:flex flex-1">
            <CommandTrigger onClick={() => setShowCmd(true)} />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setShowCmd(true)} className="sm:hidden p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors" aria-label="Поиск">
              <Menu className="h-5 w-5" />
            </button>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {canSeeNotifications && (
              <div className="relative">
                <button onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false) }}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-popover border rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="p-4 border-b font-medium text-popover-foreground flex items-center justify-between">
                        Уведомления <span className="text-xs text-muted-foreground font-normal">{notifications.length}</span>
                      </div>
                      <div className="max-h-[360px] overflow-y-auto scroll-slim p-2 space-y-1">
                        {notifications.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">Пока нет событий</p>}
                        {notifications.map((n, i) => {
                          const isEval = n.type === "evaluation"
                          const failed = n.status === "failed"
                          const Icon = isEval ? Star : failed ? AlertCircle : CheckCircle2
                          const color = isEval ? "text-brand-2" : failed ? "text-destructive" : "text-emerald-400"
                          return (
                            <div key={i} className="p-3 hover:bg-muted/50 rounded-lg text-sm transition-colors">
                              <div className={`flex items-center font-medium mb-0.5 ${color}`}>
                                <Icon className="h-4 w-4 mr-1.5 shrink-0" />
                                <span className="text-popover-foreground truncate">{n.title}</span>
                              </div>
                              <p className="text-muted-foreground text-xs pl-5">{n.detail}</p>
                              <span className="text-xs text-muted-foreground/70 mt-1 block pl-5">{timeAgo(n.at)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="relative">
              {showProfileMenu && <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />}
              <button onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false) }}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors">
                {user?.avatar_path ? (
                  <img src={user.avatar_path} alt="avatar"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                    className="h-8 w-8 rounded-full object-cover shrink-0 ring-2 ring-primary/30" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand to-brand-2 flex items-center justify-center text-brand-foreground font-bold text-sm">
                    {initials}
                  </div>
                )}
              </button>
              <AnimatePresence>
                {showProfileMenu && (
                  <ProfileMenu user={user} role={role} theme={theme} setTheme={setTheme}
                    onClose={() => setShowProfileMenu(false)} onLogout={handleLogout} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-slim p-4 md:p-8">
          <div className="max-w-7xl mx-auto pb-20">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center">
      <Code2 className="h-6 w-6 text-primary mr-2" />
      <span className="font-extrabold text-lg tracking-tight text-gradient">JUDGE</span>
    </div>
  )
}

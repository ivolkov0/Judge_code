import React from "react"
import { useNavigate } from "react-router"
import { useTheme } from "next-themes"
import {
  LayoutDashboard, Users, Trophy, UploadCloud, Terminal, SlidersHorizontal,
  Settings, User as UserIcon, LogOut, Sun, Moon, Search,
} from "lucide-react"
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut,
} from "./ui/command"
import { useAuth } from "../context/AuthContext"

const NAV: Record<string, { to: string; label: string; icon: any }[]> = {
  participant: [
    { to: "/dashboard", label: "Главная", icon: LayoutDashboard },
    { to: "/team", label: "Моя команда", icon: Users },
    { to: "/submission", label: "Решение", icon: UploadCloud },
    { to: "/algo", label: "Задачи", icon: Terminal },
    { to: "/leaderboard", label: "Рейтинг", icon: Trophy },
  ],
  jury: [
    { to: "/dashboard", label: "Панель жюри", icon: LayoutDashboard },
    { to: "/algo", label: "Задачи", icon: Terminal },
    { to: "/leaderboard", label: "Рейтинг", icon: Trophy },
  ],
  organizer: [
    { to: "/dashboard", label: "Главная", icon: LayoutDashboard },
    { to: "/teams", label: "Команды", icon: Users },
    { to: "/manage", label: "Управление", icon: SlidersHorizontal },
    { to: "/algo", label: "Задачи", icon: Terminal },
    { to: "/leaderboard", label: "Рейтинг", icon: Trophy },
  ],
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const { role, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const go = (to: string) => { onOpenChange(false); navigate(to) }
  const navItems = NAV[role || "participant"] ?? NAV.participant

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Поиск по JUDGE" description="Навигация и быстрые действия">
      <CommandInput placeholder="Куда перейти или что сделать…" />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>
        <CommandGroup heading="Навигация">
          {navItems.map((n) => (
            <CommandItem key={n.to} value={`перейти ${n.label}`} onSelect={() => go(n.to)}>
              <n.icon className="mr-2" /> {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Профиль">
          <CommandItem value="мой профиль" onSelect={() => go("/profile")}>
            <UserIcon className="mr-2" /> Мой профиль
          </CommandItem>
          <CommandItem value="настройки" onSelect={() => go("/settings")}>
            <Settings className="mr-2" /> Настройки
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Действия">
          <CommandItem value="сменить тему" onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="mr-2" /> : <Moon className="mr-2" />}
            Сменить тему
          </CommandItem>
          <CommandItem value="выйти выход" onSelect={() => { onOpenChange(false); logout(); navigate("/") }}>
            <LogOut className="mr-2" /> Выйти
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

/** Header trigger button that opens the palette. */
export function CommandTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="hidden sm:flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border bg-input-background/60 text-muted-foreground hover:text-foreground hover:border-ring/40 transition-colors text-sm">
      <Search className="h-4 w-4" />
      <span>Поиск…</span>
      <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
    </button>
  )
}

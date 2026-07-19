import React, { useState } from "react"
import { motion } from "motion/react"
import { Link, useNavigate } from "react-router"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Code2, ArrowRight, AlertCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login(email, password)
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message ?? "Неверный email или пароль")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary/20">
      <div className="absolute top-8 left-8 flex items-center">
        <Code2 className="h-6 w-6 text-primary mr-2" />
        <span className="font-bold text-xl tracking-tight">JUDGE</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card p-8 rounded-2xl border shadow-xl"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Вход в систему</h1>
          <p className="text-muted-foreground">Введите email и пароль для входа</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Пароль</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-base mt-4" disabled={isLoading}>
            {isLoading ? "Вход..." : "Войти"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground space-y-1">
          <p className="font-semibold mb-2">Демо-аккаунты (пароль: password):</p>
          <p>organizer@judge.ru — Организатор</p>
          <p>jury1@judge.ru — Жюри</p>
          <p>participant@judge.ru — Участник (команда CodeSamurais)</p>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Зарегистрироваться
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

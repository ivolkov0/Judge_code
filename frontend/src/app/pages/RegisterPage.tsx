import React, { useState } from "react"
import { motion } from "motion/react"
import { Link, useNavigate } from "react-router"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Code2, ArrowRight, AlertCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("Пароли не совпадают")
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      await register({ email, password, first_name: firstName, last_name: lastName, role: "participant" })
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message ?? "Ошибка регистрации")
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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Регистрация</h1>
          <p className="text-muted-foreground">Создайте аккаунт для начала работы</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Имя</label>
              <Input placeholder="Иван" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Фамилия</label>
              <Input placeholder="Иванов" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Пароль</label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Подтвердите пароль</label>
            <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-base mt-4" disabled={isLoading}>
            {isLoading ? "Создание аккаунта..." : "Зарегистрироваться"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Войти
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

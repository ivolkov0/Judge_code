import React, { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Switch } from "../components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { User, Bell, Palette, Shield, Camera, Image as ImageIcon, FileText } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "../context/AuthContext"
import { toast } from "sonner"

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, updateAvatar, updateProfile, changePassword } = useAuth()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    updates: false
  })

  // Profile name editing
  const [firstName, setFirstName] = useState(user?.first_name ?? "")
  const [lastName, setLastName] = useState(user?.last_name ?? "")
  const [savingProfile, setSavingProfile] = useState(false)

  // Password change
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [savingPwd, setSavingPwd] = useState(false)

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) { toast.error("Имя и фамилия обязательны"); return }
    setSavingProfile(true)
    try {
      await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() })
      toast.success("Профиль сохранён")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить")
    } finally { setSavingProfile(false) }
  }

  const submitPassword = async () => {
    if (!currentPwd || !newPwd) { toast.error("Заполните оба поля"); return }
    if (newPwd.length < 6) { toast.error("Новый пароль не короче 6 символов"); return }
    setSavingPwd(true)
    try {
      await changePassword(currentPwd, newPwd)
      toast.success("Пароль изменён")
      setCurrentPwd(""); setNewPwd("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось изменить пароль")
    } finally { setSavingPwd(false) }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой (максимум 5MB)")
      return
    }

    setUploading(true)
    try {
      await updateAvatar(file)
      toast.success("Avatar updated successfully")
      setShowAvatarMenu(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload avatar")
    } finally {
      setUploading(false)
    }
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleGalleryClick = () => {
    galleryInputRef.current?.click()
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const initials = user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : "АИ"
  const avatarUrl = user?.avatar_path ? `${user.avatar_path}?t=${Date.now()}` : null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground mt-1">Управление профилем, внешним видом и уведомлениями.</p>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-6">
        <TabsList className="flex flex-col h-auto w-full md:w-64 bg-transparent space-y-1 p-0">
          <TabsTrigger value="profile" className="w-full justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <User className="h-4 w-4 mr-2" /> Профиль
          </TabsTrigger>
          <TabsTrigger value="appearance" className="w-full justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Palette className="h-4 w-4 mr-2" /> Внешний вид
          </TabsTrigger>
          <TabsTrigger value="notifications" className="w-full justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4 mr-2" /> Уведомления
          </TabsTrigger>
          <TabsTrigger value="security" className="w-full justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4 mr-2" /> Безопасность
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="profile" className="m-0 focus-visible:outline-none">
            <Card>
              <CardHeader>
                <CardTitle>Личный профиль</CardTitle>
                <CardDescription>Измените свои личные данные, которые будут видны организаторам и жюри.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => setShowAvatarMenu(true)}
                    className="relative h-24 w-24 rounded-full shrink-0 group focus:outline-none"
                    disabled={uploading}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="h-24 w-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-brand to-brand-2 flex items-center justify-center text-white font-bold text-3xl shadow-inner">
                        {initials}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </button>
                  <div>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      variant="outline"
                      className="mb-2"
                      onClick={() => setShowAvatarMenu(true)}
                      disabled={uploading}
                    >
                      {uploading ? "Загрузка..." : "Сменить аватар"}
                    </Button>
                    <p className="text-sm text-muted-foreground">Любой формат: JPG, PNG, WebP, GIF и другие. Максимум 5MB.</p>
                  </div>
                </div>

                <Dialog open={showAvatarMenu} onOpenChange={setShowAvatarMenu}>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Выбрать источник аватара</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        className="justify-start gap-3"
                        onClick={handleCameraClick}
                      >
                        <Camera className="h-5 w-5" />
                        Сделать фото
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start gap-3"
                        onClick={handleGalleryClick}
                      >
                        <ImageIcon className="h-5 w-5" />
                        Выбрать из галереи
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start gap-3"
                        onClick={handleFileClick}
                      >
                        <FileText className="h-5 w-5" />
                        Выбрать из файлов
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Имя</label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Фамилия</label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" defaultValue={user?.email} readOnly className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Для изменения email обратитесь к администратору.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? "Сохранение…" : "Сохранить изменения"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="m-0 focus-visible:outline-none">
            <Card>
              <CardHeader>
                <CardTitle>Внешний вид</CardTitle>
                <CardDescription>Настройте тему оформления интерфейса платформы.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Тема оформления</label>
                  <p className="text-sm text-muted-foreground mb-4">Выберите светлую или темную тему оформления для комфортной работы.</p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className={`border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      onClick={() => setTheme('light')}
                    >
                      <div className="w-full h-20 bg-[#f3f4f6] rounded-md border shadow-sm flex flex-col p-2 gap-1 overflow-hidden">
                         <div className="w-full h-3 bg-white rounded-sm" />
                         <div className="w-1/2 h-2 bg-[#e5e7eb] rounded-sm" />
                      </div>
                      <span className="text-sm font-medium">Светлая</span>
                    </div>
                    
                    <div 
                      className={`border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      onClick={() => setTheme('dark')}
                    >
                      <div className="w-full h-20 bg-[#0f172a] rounded-md border border-slate-700 shadow-sm flex flex-col p-2 gap-1 overflow-hidden">
                         <div className="w-full h-3 bg-slate-800 rounded-sm" />
                         <div className="w-1/2 h-2 bg-slate-800 rounded-sm" />
                      </div>
                      <span className="text-sm font-medium">Темная</span>
                    </div>

                    <div 
                      className={`border-2 rounded-xl p-4 cursor-pointer flex flex-col items-center gap-3 transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      onClick={() => setTheme('system')}
                    >
                      <div className="w-full h-20 bg-gradient-to-r from-[#f3f4f6] to-[#0f172a] rounded-md border shadow-sm flex flex-col p-2 gap-1 overflow-hidden">
                         <div className="w-full h-3 bg-white/50 rounded-sm" />
                      </div>
                      <span className="text-sm font-medium">Системная</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="m-0 focus-visible:outline-none">
            <Card>
              <CardHeader>
                <CardTitle>Уведомления</CardTitle>
                <CardDescription>Управляйте тем, какие уведомления вы будете получать.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Email уведомления</label>
                      <p className="text-sm text-muted-foreground">Получать важные системные уведомления на почту.</p>
                    </div>
                    <Switch checked={notifications.email} onCheckedChange={(c) => setNotifications({...notifications, email: c})} />
                  </div>
                  <div className="border-t my-4" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Уведомления о новых загрузках</label>
                      <p className="text-sm text-muted-foreground">Получать пуш-уведомления когда команды загружают новые решения.</p>
                    </div>
                    <Switch checked={notifications.push} onCheckedChange={(c) => setNotifications({...notifications, push: c})} />
                  </div>
                  <div className="border-t my-4" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Новости платформы</label>
                      <p className="text-sm text-muted-foreground">Информация о новых функциях и релизах JUDGE.</p>
                    </div>
                    <Switch checked={notifications.updates} onCheckedChange={(c) => setNotifications({...notifications, updates: c})} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="m-0 focus-visible:outline-none">
             <Card>
              <CardHeader>
                <CardTitle>Безопасность</CardTitle>
                <CardDescription>Настройки пароля и аутентификации.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                   <label className="text-sm font-medium">Текущий пароль</label>
                   <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium">Новый пароль</label>
                   <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                </div>
                <Button className="mt-4" onClick={submitPassword} disabled={savingPwd}>
                  {savingPwd ? "Сохранение…" : "Сменить пароль"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

import React from 'react'
import { RouterProvider } from 'react-router'
import { router } from './routes'
import { ThemeProvider } from './components/theme-provider'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}

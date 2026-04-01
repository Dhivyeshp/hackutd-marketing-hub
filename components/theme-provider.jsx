'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('marketing-theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : systemPrefersDark
        ? 'dark'
        : 'light'

    setTheme(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [])

  function updateTheme(nextTheme) {
    setTheme(nextTheme)
    applyTheme(nextTheme)
    window.localStorage.setItem('marketing-theme', nextTheme)
  }

  const value = useMemo(() => ({
    theme,
    mounted,
    setTheme: updateTheme,
    toggleTheme: () => updateTheme(theme === 'dark' ? 'light' : 'dark'),
  }), [theme, mounted])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}

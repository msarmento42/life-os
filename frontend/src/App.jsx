import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import CommandPalette from './components/CommandPalette'
import AnimatedRoutes from './components/AnimatedRoutes'
import { ToastProvider } from './components/Toast'

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('life-os-dark')
    return saved !== null ? saved === 'true' : true
  })

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
    localStorage.setItem('life-os-dark', darkMode)
  }, [darkMode])

  // Global keyboard shortcut: Cmd+K → open command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <ToastProvider>
      <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
        {/* Sidebar — hidden on mobile, icon rail on tablet, full on desktop */}
        <Sidebar darkMode={darkMode} toggleDark={() => setDarkMode(d => !d)} />

        {/* Main content — extra bottom padding on mobile so bottom nav doesn't cover content */}
        <main className="flex-1 overflow-y-auto bg-gray-950 dark:bg-gray-950 pb-safe md:pb-0">
          <div className="md:pb-0 pb-16">
            <AnimatedRoutes />
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav darkMode={darkMode} toggleDark={() => setDarkMode(d => !d)} />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </ToastProvider>
  )
}

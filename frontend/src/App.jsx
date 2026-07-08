import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import CommandPalette from './components/CommandPalette'
import AnimatedRoutes from './components/AnimatedRoutes'
import { ToastProvider } from './components/Toast'
import KeyboardShortcutsOverlay from './components/KeyboardShortcutsOverlay';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { SkeletonRow } from './components/Skeleton';

const Tasks = lazy(() => import('./modules/Tasks'));

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('life-os-dark')
    return saved !== null ? saved === 'true' : true
  })

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false); // New state for shortcuts overlay

  const navigate = useNavigate(); // Initialize useNavigate

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
  // Refactored to use useKeyboardShortcut hook
  useKeyboardShortcut({ key: 'k', meta: true }, (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  }, []);

  // Global keyboard shortcut: Cmd+? → Toggle keyboard shortcuts overlay
  useKeyboardShortcut({ key: '?', meta: true }, (e) => {
    e.preventDefault();
    setShowShortcuts(prev => !prev);
  }, []);

  // Global keyboard shortcut: Cmd+N → Quick-add new task
  useKeyboardShortcut({ key: 'n', meta: true }, (e) => {
    e.preventDefault();
    // If a global task modal exists, open it; otherwise navigate to /tasks
    // For now, we navigate to /tasks as there's no global task modal implemented yet.
    console.log("Cmd+N pressed: Quick-add new task (navigating to /tasks)");
    navigate('/tasks'); // Assuming a /tasks route exists
  }, [navigate]);

  // Global keyboard shortcut: Escape → Close any open modal/overlay
  // This will close the command palette if it's open.
  // The KeyboardShortcutsOverlay component handles its own Escape closing.
  useKeyboardShortcut({ key: 'escape' }, (e) => {
    if (commandPaletteOpen) {
      e.preventDefault(); // Prevent default if closing command palette
      setCommandPaletteOpen(false);
    }
    // If showShortcuts is open, its own hook inside KeyboardShortcutsOverlay will handle closing it.
  }, [commandPaletteOpen]);

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

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </ToastProvider>
  )
}

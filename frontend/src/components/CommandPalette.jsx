import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import axios from 'axios'

const SECTION_NAMES = {
  contacts: 'Contacts',
  transactions: 'Transactions',
  books: 'Books',
  projects: 'Projects',
  objectives: 'Objectives',
  habits: 'Habits',
  trades: 'Trades',
  trips: 'Trips',
  tasks: 'Tasks',
  time_blocks: 'Time Blocks',
  decisions: 'Decisions',
}

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Flatten results for keyboard navigation
  const flatResults = Object.entries(results)
    .flatMap(([section, items]) => items.map(item => ({ ...item, section })))

  // Search handler
  useEffect(() => {
    if (!query.trim()) {
      setResults({})
      setSelectedIndex(0)
      return
    }

    setLoading(true)
    axios
      .get('/api/search/global', { params: { q: query, limit: 50 } })
      .then(res => {
        setResults(res.data)
        setSelectedIndex(0)
      })
      .catch(err => console.error('Search error:', err))
      .finally(() => setLoading(false))
  }, [query])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => (i + 1) % Math.max(1, flatResults.length))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => (i - 1 + Math.max(1, flatResults.length)) % Math.max(1, flatResults.length))
          break
        case 'Enter':
          e.preventDefault()
          if (flatResults[selectedIndex]) {
            const item = flatResults[selectedIndex]
            navigate(item.route)
            onClose()
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, flatResults, selectedIndex, navigate, onClose])

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search contacts, tasks, decisions, books, projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-sm"
          />
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded-lg -mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">
              Searching...
            </div>
          )}

          {!loading && query && Object.keys(results).length === 0 && (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">
              No results found for "{query}"
            </div>
          )}

          {!loading && !query && (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">
              Start typing to search...
            </div>
          )}

          {Object.entries(results).map(([section, items]) => (
            <div key={section}>
              {/* Section header */}
              <div className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {SECTION_NAMES[section]}
              </div>

              {/* Section items */}
              {items.map((item, idx) => {
                const globalIdx = flatResults.findIndex(
                  r => r.id === item.id && r.type === item.type
                )
                const isSelected = selectedIndex === globalIdx

                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      navigate(item.route)
                      onClose()
                    }}
                    className={`w-full px-5 py-3 text-left border-b border-gray-800/50 transition-colors ${
                      isSelected
                        ? 'bg-brand-500/10 border-brand-500/20'
                        : 'hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${item.color || 'text-gray-100'}`}>
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        {!query && Object.keys(results).length === 0 && (
          <div className="px-5 py-3 border-t border-gray-800 bg-gray-950/50 text-xs text-gray-600 flex items-center justify-between">
            <span>Press <kbd className="px-2 py-0.5 rounded bg-gray-800 text-gray-400">↑↓</kbd> to navigate, <kbd className="px-2 py-0.5 rounded bg-gray-800 text-gray-400">enter</kbd> to select, <kbd className="px-2 py-0.5 rounded bg-gray-800 text-gray-400">esc</kbd> to close</span>
          </div>
        )}
      </div>
    </div>
  )
}

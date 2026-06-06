/**
 * BottomNav — mobile-only bottom navigation bar (<768px / md breakpoint).
 * Shows all nav items as a horizontally scrollable icon + label strip.
 * Hidden on md+ (desktop/tablet use the sidebar instead).
 */

import { NavLink } from 'react-router-dom'
import { DollarSign, Plane, Users, BookOpen, Heart, CheckSquare, Library, FolderKanban, Smile, TrendingUp, Sun, Moon, ListTodo, Clock, Scale, Settings } from 'lucide-react'

const navItems = [
  { to: '/tasks',    label: 'Tasks',    icon: ListTodo,     color: 'text-violet-400'  },
  { to: '/mood',     label: 'Mood',     icon: Smile,        color: 'text-pink-400'    },
  { to: '/habits',   label: 'Habits',   icon: CheckSquare,  color: 'text-amber-400'   },
  { to: '/time',     label: 'Time',     icon: Clock,        color: 'text-teal-400'    },
  { to: '/finance',  label: 'Finance',  icon: DollarSign,   color: 'text-emerald-400' },
  { to: '/health',   label: 'Health',   icon: Heart,        color: 'text-red-400'     },
  { to: '/projects', label: 'Projects', icon: FolderKanban, color: 'text-blue-400'    },
  { to: '/trading',  label: 'Trading',  icon: TrendingUp,   color: 'text-cyan-400'    },
  { to: '/reading',   label: 'Reading',   icon: Library,  color: 'text-purple-400'  },
  { to: '/decisions', label: 'Decisions', icon: Scale,   color: 'text-yellow-400'  },
  { to: '/crm',      label: 'People',   icon: Users,        color: 'text-indigo-400'  },
  { to: '/travel',   label: 'Travel',   icon: Plane,        color: 'text-orange-400'  },
  { to: '/wiki',     label: 'Wiki',     icon: BookOpen,     color: 'text-gray-400'    },
  { to: '/settings', label: 'Settings', icon: Settings,     color: 'text-gray-400'    },
]

export default function BottomNav({ darkMode, toggleDark }) {
  return (
    <nav className="
      md:hidden fixed bottom-0 left-0 right-0 z-30
      bg-gray-950/95 backdrop-blur-md
      border-t border-gray-800/80
      safe-area-bottom
    ">
      {/* Scrollable nav strip */}
      <div className="flex items-center overflow-x-auto scrollbar-none px-1 py-1">
        {navItems.map(({ to, label, icon: Icon, color }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-400' : color}`} />
                <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-brand-400' : 'text-gray-500'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Dark mode toggle at end */}
        <button
          onClick={toggleDark}
          className="bottom-nav-item shrink-0"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode
            ? <Sun className="w-5 h-5 text-yellow-400" />
            : <Moon className="w-5 h-5 text-blue-400" />
          }
          <span className="text-[10px] font-medium mt-0.5 text-gray-500">
            {darkMode ? 'Light' : 'Dark'}
          </span>
        </button>
      </div>
    </nav>
  )
}

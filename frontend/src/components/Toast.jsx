import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Toast notification system.
 *
 * Wrap your app:
 *   <ToastProvider>...</ToastProvider>
 *
 * Use in any component:
 *   const toast = useToast()
 *   toast.success('Saved')
 *   toast.error('Something broke')
 *   toast.warning('Heads up')
 *   toast.info('FYI')
 *
 * Auto-dismiss with progress bar; manual close via the X button.
 */

const ToastCtx = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const COLOR = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-brand-400',
}

const VARIANT = {
  success: 'toast-success',
  error: 'toast-error',
  warning: 'toast-warning',
  info: 'toast-info',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((variant, message, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    const duration = opts.duration ?? 4000
    setToasts((ts) => [...ts, { id, variant, message, duration }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const api = {
    success: (m, opts) => push('success', m, opts),
    error:   (m, opts) => push('error', m, opts),
    warning: (m, opts) => push('warning', m, opts),
    info:    (m, opts) => push('info', m, opts),
    dismiss,
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) {
    // graceful no-op fallback if used outside provider
    return {
      success: () => {}, error: () => {}, warning: () => {}, info: () => {}, dismiss: () => {},
    }
  }
  return ctx
}

function ToastViewport({ toasts, dismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, dismiss }) {
  const Icon = ICONS[toast.variant] || Info
  return (
    <div className={`toast ${VARIANT[toast.variant]}`} role="status">
      <div className="toast-body">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${COLOR[toast.variant]}`} />
        <div className="text-sm text-gray-100 flex-1 leading-snug">{toast.message}</div>
        <button
          onClick={() => dismiss(toast.id)}
          className="text-gray-500 hover:text-gray-300 transition-colors -mr-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {toast.duration > 0 && (
        <div
          className={`toast-progress ${COLOR[toast.variant]}`}
          style={{ animation: `progress ${toast.duration}ms linear forwards` }}
        />
      )}
    </div>
  )
}

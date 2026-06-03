import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ title, onClose, children, size = 'md' }) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export function ConfirmModal({ title, message, onConfirm, onClose, danger = true }) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <p className="text-gray-400 text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>
          Confirm
        </button>
      </div>
    </Modal>
  )
}

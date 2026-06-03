import { Inbox } from 'lucide-react'

/**
 * EmptyState — shown when a module has no data yet.
 *
 * Props:
 *   icon       a lucide-react icon component (defaults to Inbox)
 *   title      short headline
 *   description optional sub-text
 *   action     optional { label, onClick } — renders a primary CTA button
 *   children   optional custom action area (renders below description)
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
  children,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-icon">
        <Icon className="w-6 h-6" />
      </div>
      <div className="empty-title">{title}</div>
      {description && <p className="empty-desc">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
      {children}
    </div>
  )
}

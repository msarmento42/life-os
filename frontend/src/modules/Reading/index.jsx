import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Star, BookOpen, Quote, BookMarked, RefreshCw, Brain, AlertCircle, Calendar, CheckCircle2, Library } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

const STATUS_CONFIG = {
  reading:      { label: 'Reading',        color: '#3b82f6', bg: 'bg-blue-900/50 text-blue-400' },
  completed:    { label: 'Completed',      color: '#22c55e', bg: 'bg-emerald-900/50 text-emerald-400' },
  want_to_read: { label: 'Want to Read',   color: '#8b5cf6', bg: 'bg-purple-900/50 text-purple-400' },
  abandoned:    { label: 'Abandoned',      color: '#6b7280', bg: 'bg-gray-800 text-gray-500' },
}

const GENRES = ['Self-improvement', 'Business', 'Finance', 'Philosophy', 'Psychology', 'History', 'Science', 'Productivity', 'Fiction', 'Biography', 'Technology', 'Other']

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)} className="transition-transform hover:scale-110">
          <Star className={`w-5 h-5 ${n <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`} />
        </button>
      ))}
    </div>
  )
}

export default function Reading() {
  const [books, setBooks] = useState([])
  const [stats, setStats] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [newNote, setNewNote] = useState('')
  const [newQuote, setNewQuote] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('library') // 'library' | 'review'
  const [reviewQueue, setReviewQueue] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const toast = useToast()

  const [form, setForm] = useState({ title: '', author: '', genre: '', status: 'want_to_read', rating: null, page_count: '', source: 'physical', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const params = filterStatus ? { status: filterStatus } : {}
      const [bRes, sRes] = await Promise.all([
        axios.get('/api/reading/books', { params }),
        axios.get('/api/reading/stats'),
      ])
      setBooks(bRes.data)
      setStats(sRes.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [filterStatus])
  useEffect(() => { if (viewMode === 'review') loadReviewQueue() }, [viewMode])

  const loadSelected = async (id) => {
    const res = await axios.get(`/api/reading/books/${id}`)
    setSelected(res.data)
  }

  const loadReviewQueue = async () => {
    if (reviewQueue) return // already loaded; refresh handled by manual trigger
    setReviewLoading(true)
    try {
      const res = await axios.get('/api/reading/review-queue')
      setReviewQueue(res.data)
    } finally {
      setReviewLoading(false)
    }
  }

  const refreshReviewQueue = async () => {
    setReviewLoading(true)
    try {
      const res = await axios.get('/api/reading/review-queue')
      setReviewQueue(res.data)
    } finally {
      setReviewLoading(false)
    }
  }

  const markReviewed = async (bookId) => {
    try {
      await axios.post(`/api/reading/books/${bookId}/review`)
      toast.success('Review logged — next date scheduled')
      refreshReviewQueue()
      if (selected?.id === bookId) loadSelected(bookId)
    } catch {
      toast.error('Failed to log review')
    }
  }

  const toggleChangedBehavior = async (bookId, value) => {
    try {
      await axios.patch(`/api/reading/books/${bookId}/depth`, { changed_behavior: value })
      if (selected?.id === bookId) loadSelected(bookId)
    } catch {
      toast.error('Failed to update')
    }
  }

  const addBook = async () => {
    try {
      await axios.post('/api/reading/books', { ...form, page_count: parseInt(form.page_count) || null })
      toast.success('Book added')
      setShowAdd(false)
      setForm({ title: '', author: '', genre: '', status: 'want_to_read', rating: null, page_count: '', source: 'physical', notes: '' })
      load()
    } catch {
      toast.error('Failed to add book')
    }
  }

  const updateStatus = async (bookId, status) => {
    try {
      const updates = { status }
      if (status === 'reading' && !selected?.started_date) updates.started_date = new Date().toISOString().split('T')[0]
      if (status === 'completed' && !selected?.finished_date) updates.finished_date = new Date().toISOString().split('T')[0]
      await axios.put(`/api/reading/books/${bookId}`, updates)
      const label = { reading: 'Started reading', completed: 'Marked as completed', want_to_read: 'Moved to want-to-read', abandoned: 'Marked as abandoned' }
      toast.success(label[status] || 'Status updated')
      load(); if (selected?.id === bookId) loadSelected(bookId)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    try {
      await axios.post('/api/reading/notes', { book_id: selected.id, content: newNote })
      toast.success('Note added')
      setNewNote('')
      loadSelected(selected.id)
    } catch {
      toast.error('Failed to add note')
    }
  }

  const addQuote = async () => {
    if (!newQuote.trim()) return
    try {
      await axios.post('/api/reading/quotes', { book_id: selected.id, quote: newQuote })
      toast.success('Quote saved')
      setNewQuote('')
      loadSelected(selected.id)
    } catch {
      toast.error('Failed to save quote')
    }
  }

  const currentlyReading = books.filter(b => b.status === 'reading')
  const otherBooks = books.filter(b => b.status !== 'reading')

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-purple-500"></div>
            <h1 className="text-xl font-bold text-gray-100">Reading List</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
              <button
                onClick={() => setViewMode('library')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${viewMode === 'library' ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
              >
                <Library className="w-3 h-3" /> Library
              </button>
              <button
                onClick={() => setViewMode('review')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${viewMode === 'review' ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
              >
                <Brain className="w-3 h-3" /> Review Queue
              </button>
            </div>
            <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Book
            </button>
          </div>
        </div>
        {stats && (
          <div className="flex gap-6 mt-4">
            {[['📚', stats.completed, 'Read'], ['📖', stats.reading, 'Reading'], ['🔖', stats.want_to_read, 'Want to Read']].map(([icon, val, label]) => (
              <div key={label} className="text-center">
                <div className="text-lg font-bold text-gray-100">{icon} {val}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
            {stats.avg_rating && (
              <div className="text-center">
                <div className="text-lg font-bold text-amber-400">⭐ {stats.avg_rating}</div>
                <div className="text-xs text-gray-500">Avg Rating</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Book list / Review queue panel */}
        <div className="w-80 shrink-0 border-r border-gray-800 overflow-y-auto p-4 space-y-4">
          {viewMode === 'library' ? (
            <>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setFilterStatus('')}
                  className={`badge text-xs cursor-pointer ${!filterStatus ? 'bg-brand-500/30 text-brand-400' : 'bg-gray-800 text-gray-500'}`}>All</button>
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                  <button key={status} onClick={() => setFilterStatus(status)}
                    className={`badge text-xs cursor-pointer ${filterStatus === status ? cfg.bg : 'bg-gray-800 text-gray-500'}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : books.length === 0 ? (
                <EmptyState
                  icon={BookMarked}
                  title="No books yet"
                  description="Start building your reading list to track what you've learned."
                  action={{ label: '+ Add Book', onClick: () => setShowAdd(true) }}
                />
              ) : (
                <>
                  {currentlyReading.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Currently Reading</div>
                      {currentlyReading.map(b => <BookCard key={b.id} book={b} selected={selected?.id === b.id} onClick={() => loadSelected(b.id)} />)}
                    </div>
                  )}
                  <div>
                    {currentlyReading.length > 0 && <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Other</div>}
                    {otherBooks.map(b => <BookCard key={b.id} book={b} selected={selected?.id === b.id} onClick={() => loadSelected(b.id)} />)}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Review Queue panel */
            <ReviewQueuePanel
              queue={reviewQueue}
              loading={reviewLoading}
              selected={selected}
              onSelect={loadSelected}
              onRefresh={refreshReviewQueue}
              onMarkReviewed={markReviewed}
            />
          )}
        </div>

        {/* Book detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected && (
            <EmptyState
              icon={BookOpen}
              title="Select a book"
              description="Choose a book from your list to view details, add notes, and track your reading progress."
            />
          )}
          {selected && (
            <div className="max-w-2xl space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">{selected.title}</h2>
                  <div className="text-gray-400 mt-1">{selected.author}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`badge text-xs ${STATUS_CONFIG[selected.status]?.bg}`}>
                      {STATUS_CONFIG[selected.status]?.label}
                    </span>
                    {selected.genre && <span className="badge bg-gray-800 text-gray-400 text-xs">{selected.genre}</span>}
                    {selected.source && <span className="badge bg-gray-800 text-gray-500 text-xs">{selected.source}</span>}
                  </div>
                </div>
                <button className="btn-ghost p-2 text-red-400" onClick={() => setDeleteId(selected.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Rating */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-400">Rating</div>
                  <StarRating value={selected.rating} onChange={async (r) => {
                    await axios.put(`/api/reading/books/${selected.id}`, { rating: r })
                    loadSelected(selected.id); load()
                  }} />
                </div>

                {/* Progress */}
                {selected.page_count && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{selected.current_page || 0} / {selected.page_count} pages ({selected.progress_pct || 0}%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selected.progress_pct || 0}%` }} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input className="input text-xs flex-1" type="number" placeholder="Current page"
                        onBlur={async (e) => {
                          await axios.put(`/api/reading/books/${selected.id}`, { current_page: parseInt(e.target.value) })
                          loadSelected(selected.id)
                        }} defaultValue={selected.current_page} />
                    </div>
                  </div>
                )}

                {/* Status change buttons */}
                <div className="flex gap-2 mt-3">
                  {Object.entries(STATUS_CONFIG).filter(([s]) => s !== selected.status).map(([s, cfg]) => (
                    <button key={s} className="btn-secondary text-xs" onClick={() => updateStatus(selected.id, s)}>
                      → {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="card">
                <div className="section-title mb-3">Notes</div>
                <div className="space-y-2 mb-3">
                  {selected.notes_list?.map(n => (
                    <div key={n.id} className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">{n.content}</div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea className="input text-sm flex-1" rows={2} placeholder="Add a note..."
                    value={newNote} onChange={e => setNewNote(e.target.value)} />
                  <button className="btn-secondary text-xs self-end" onClick={addNote}>Add</button>
                </div>
              </div>

              {/* Quotes */}
              <div className="card">
                <div className="flex items-center gap-2 section-title mb-3"><Quote className="w-4 h-4 text-amber-400" /> Quotes</div>
                <div className="space-y-2 mb-3">
                  {selected.quotes_list?.map(q => (
                    <blockquote key={q.id} className="border-l-2 border-amber-500 pl-3 py-1 text-sm text-gray-300 italic">
                      {q.quote}
                      {q.page_number && <span className="text-gray-600 not-italic text-xs ml-2">p.{q.page_number}</span>}
                    </blockquote>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea className="input text-sm flex-1" rows={2} placeholder="Add a quote..."
                    value={newQuote} onChange={e => setNewQuote(e.target.value)} />
                  <button className="btn-secondary text-xs self-end" onClick={addQuote}>Add</button>
                </div>
              </div>

              {/* Impact & Spaced Repetition (completed books) */}
              {selected.status === 'completed' && (
                <div className="card">
                  <div className="flex items-center gap-2 section-title mb-4">
                    <Brain className="w-4 h-4 text-purple-400" /> Impact & Review
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer mb-4 group">
                    <div
                      onClick={() => toggleChangedBehavior(selected.id, !selected.changed_behavior)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        selected.changed_behavior
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-600 hover:border-purple-500'
                      }`}
                    >
                      {selected.changed_behavior && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors select-none">
                      This book changed my behavior or thinking
                    </span>
                  </label>

                  {selected.changed_behavior && (
                    <div className="border-t border-gray-800 pt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {selected.next_review_date
                              ? `Next review: ${new Date(selected.next_review_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              : 'No review scheduled yet'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-600">
                          {selected.review_count > 0 ? `Review #${selected.review_count + 1}` : 'First review'}
                        </span>
                      </div>
                      <button
                        className="btn-secondary text-xs flex items-center gap-1.5"
                        onClick={() => markReviewed(selected.id)}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Mark Reviewed — schedule next
                      </button>
                      <div className="text-xs text-gray-600">
                        Intervals: 7 → 14 → 30 → 60 → 120 → 180 days
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Book" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="label">Title</label><input className="input" placeholder="Book title" value={form.title} onChange={e => set('title', e.target.value)} /></div>
              <div><label className="label">Author</label><input className="input" placeholder="Author name" value={form.author} onChange={e => set('author', e.target.value)} /></div>
              <div><label className="label">Genre</label>
                <select className="input" value={form.genre} onChange={e => set('genre', e.target.value)}>
                  <option value="">Select genre</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div><label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {Object.entries(STATUS_CONFIG).map(([s, cfg]) => <option key={s} value={s}>{cfg.label}</option>)}
                </select>
              </div>
              <div><label className="label">Source</label>
                <select className="input" value={form.source} onChange={e => set('source', e.target.value)}>
                  {['physical', 'kindle', 'audiobook', 'library'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div><label className="label">Pages</label><input className="input" type="number" placeholder="300" value={form.page_count} onChange={e => set('page_count', e.target.value)} /></div>
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={addBook}>Add Book</button>
            </div>
          </div>
        </Modal>
      )}
      {deleteId && (
        <ConfirmModal title="Remove Book" message="Remove this book from your list?" onConfirm={async () => {
          try {
            await axios.delete(`/api/reading/books/${deleteId}`)
            toast.success('Book removed')
          } catch {
            toast.error('Failed to remove book')
          }
          setDeleteId(null); setSelected(null); load()
        }} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}

function ReviewQueuePanel({ queue, loading, selected, onSelect, onRefresh, onMarkReviewed }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!queue) return null

  const { overdue = [], unscheduled = [], upcoming = [] } = queue
  const total = overdue.length + unscheduled.length + upcoming.length

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
        <div className="text-sm font-medium text-gray-300">All caught up!</div>
        <div className="text-xs text-gray-500 mt-1">
          No books pending review. Mark completed books as impactful to build your review queue.
        </div>
        <button className="btn-secondary text-xs mt-3" onClick={onRefresh}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
    )
  }

  function QueueBook({ book, urgency }) {
    const colors = {
      overdue: 'border-l-2 border-red-500',
      unscheduled: 'border-l-2 border-amber-500',
      upcoming: 'border-l-2 border-blue-500',
    }
    return (
      <div
        className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 ${colors[urgency]} ${
          selected?.id === book.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'
        }`}
        onClick={() => onSelect(book.id)}
      >
        <div className="font-medium text-sm text-gray-200 leading-tight">{book.title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{book.author}</div>
        {book.next_review_date && (
          <div className={`text-xs mt-1 ${urgency === 'overdue' ? 'text-red-400' : 'text-gray-500'}`}>
            {urgency === 'overdue' ? '⚠ Overdue · ' : ''}
            {new Date(book.next_review_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
        {urgency === 'unscheduled' && (
          <div className="text-xs text-amber-500 mt-1">Needs first review</div>
        )}
        <button
          className="btn-secondary text-[10px] mt-2 px-2 py-0.5"
          onClick={e => { e.stopPropagation(); onMarkReviewed(book.id) }}
        >
          <RefreshCw className="w-2.5 h-2.5" /> Mark Reviewed
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{total} book{total !== 1 ? 's' : ''} to review</div>
        <button className="text-gray-500 hover:text-gray-300" onClick={onRefresh}>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {overdue.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold uppercase tracking-wide mb-2">
            <AlertCircle className="w-3 h-3" /> Overdue ({overdue.length})
          </div>
          {overdue.map(b => <QueueBook key={b.id} book={b} urgency="overdue" />)}
        </div>
      )}

      {unscheduled.length > 0 && (
        <div>
          <div className="text-xs text-amber-400 font-semibold uppercase tracking-wide mb-2">
            First Review Due ({unscheduled.length})
          </div>
          {unscheduled.map(b => <QueueBook key={b.id} book={b} urgency="unscheduled" />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-2">
            Upcoming · Next 30 Days ({upcoming.length})
          </div>
          {upcoming.map(b => <QueueBook key={b.id} book={b} urgency="upcoming" />)}
        </div>
      )}
    </div>
  )
}

function BookCard({ book, selected, onClick }) {
  const cfg = STATUS_CONFIG[book.status]
  return (
    <div onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 border ${selected ? 'bg-gray-800 border-gray-600' : 'border-transparent hover:bg-gray-800/50'}`}>
      <div className="font-medium text-sm text-gray-200 leading-tight">{book.title}</div>
      <div className="text-xs text-gray-500 mt-0.5">{book.author}</div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`badge text-[10px] ${cfg?.bg}`}>{cfg?.label}</span>
        {book.rating && (
          <div className="flex">
            {Array.from({ length: book.rating }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
        )}
      </div>
      {book.status === 'reading' && book.progress_pct != null && (
        <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${book.progress_pct}%` }} />
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Search, Plus, ChevronRight, ChevronDown, FileText, Folder, Clock, Link2, Pencil, Save, X, Home, Loader2 } from 'lucide-react'
import { useToast } from '../../components/Toast'

// --- File tree node ---
function TreeNode({ node, selectedPath, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2)
  if (node.type === 'file') {
    return (
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
          selectedPath === node.path ? 'bg-brand-500/20 text-brand-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node.path)}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    )
  }
  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm text-gray-500 hover:text-gray-300 transition-colors"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        <Folder className="w-3.5 h-3.5 shrink-0 text-amber-500/70" />
        <span className="font-medium text-gray-400">{node.name}</span>
      </div>
      {open && node.children?.map((child, i) => (
        <TreeNode key={i} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  )
}

// --- Quick capture modal ---
function QuickCapture({ folders, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('')
  const toast = useToast()
  const create = async () => {
    if (!title.trim()) return
    try {
      await axios.post('/api/wiki/article', { title, folder })
      toast.success('Article created')
      onCreated(`${folder ? folder + '/' : ''}${title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')}.md`)
      onClose()
    } catch {
      toast.error('Failed to create article')
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 p-5 shadow-2xl">
        <div className="text-sm font-semibold text-gray-300 mb-3">Quick Capture</div>
        <input autoFocus className="input mb-3" placeholder="Article title..." value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()} />
        <select className="input mb-3 text-sm" value={folder} onChange={e => setFolder(e.target.value)}>
          <option value="">Root (no folder)</option>
          {folders.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary text-xs" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-xs" onClick={create}>Create Article</button>
        </div>
      </div>
    </div>
  )
}

// --- Search results ---
function SearchResults({ results, onSelect }) {
  if (!results.length) return <div className="text-gray-500 text-sm text-center py-8">No results found.</div>
  return (
    <div className="space-y-2">
      {results.map((r, i) => (
        <div key={i} className="card-sm hover:border-gray-600 cursor-pointer transition-colors" onClick={() => onSelect(r.path)}>
          <div className="font-medium text-gray-200 text-sm">{r.name}</div>
          <div className="text-xs text-gray-500 truncate mt-0.5">{r.path}</div>
          <div className="text-xs text-gray-400 mt-1 line-clamp-2">...{r.snippet}...</div>
        </div>
      ))}
    </div>
  )
}

// --- Article viewer/editor ---
function ArticleView({ article, onClose, onUpdate, onNavigate }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(article.content)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    setContent(article.content)
    setEditing(false)
  }, [article.path])

  const save = async () => {
    setSaving(true)
    try {
      await axios.put('/api/wiki/article', { path: article.path, content })
      toast.success('Article saved')
      setEditing(false)
      onUpdate()
    } catch {
      toast.error('Failed to save article')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editing, content])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-100">{article.title}</h2>
          <div className="text-xs text-gray-600 mt-0.5">{article.path}</div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button className="btn-secondary text-xs" onClick={() => { setEditing(false); setContent(article.content) }}>
                <X className="w-3.5 h-3.5" /> Discard
              </button>
              <button className="btn-primary text-xs" onClick={save} disabled={saving}>
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          className="input font-mono text-sm flex-1 resize-none min-h-[60vh]"
          value={content}
          onChange={e => {
            setContent(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
        />
      ) : (
        <div className="prose prose-invert prose-sm max-w-none flex-1 overflow-y-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}
            components={{
              h1: ({children}) => <h1 className="text-2xl font-bold text-gray-100 mt-0 mb-4">{children}</h1>,
              h2: ({children}) => <h2 className="text-lg font-semibold text-gray-200 mt-6 mb-3 border-b border-gray-800 pb-1">{children}</h2>,
              h3: ({children}) => <h3 className="text-base font-semibold text-gray-300 mt-4 mb-2">{children}</h3>,
              p: ({children}) => <p className="text-gray-300 leading-relaxed mb-3">{children}</p>,
              a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{children}</a>,
              code: ({inline, children}) => inline
                ? <code className="bg-gray-800 text-brand-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                : <code className="block bg-gray-800 text-gray-200 p-4 rounded-lg text-xs font-mono overflow-x-auto">{children}</code>,
              pre: ({children}) => <pre className="mb-4">{children}</pre>,
              blockquote: ({children}) => <blockquote className="border-l-4 border-brand-500 pl-4 text-gray-400 italic my-4">{children}</blockquote>,
              ul: ({children}) => <ul className="text-gray-300 space-y-1 mb-3 pl-5 list-disc">{children}</ul>,
              ol: ({children}) => <ol className="text-gray-300 space-y-1 mb-3 pl-5 list-decimal">{children}</ol>,
              li: ({children}) => <li className="leading-relaxed">{children}</li>,
              table: ({children}) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse">{children}</table></div>,
              th: ({children}) => <th className="text-left p-2 border border-gray-700 bg-gray-800 text-gray-200 font-medium">{children}</th>,
              td: ({children}) => <td className="p-2 border border-gray-700 text-gray-300">{children}</td>,
              hr: () => <hr className="border-gray-800 my-6" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}

      {article.backlinks?.length > 0 && !editing && (
        <div className="mt-6 pt-4 border-t border-gray-800 shrink-0">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Link2 className="w-3.5 h-3.5" /> Referenced by ({article.backlinks.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {article.backlinks.map((bl, i) => {
              const blPath = typeof bl === 'string' ? bl : bl.path
              const blTitle = typeof bl === 'string'
                ? blPath.replace(/\.md$/, '').replace(/-/g, ' ').replace(/_/g, ' ')
                : (bl.title || blPath)
              return (
                <button key={i}
                  className="badge bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors cursor-pointer border border-gray-700"
                  onClick={() => onNavigate && onNavigate(blPath)}
                >
                  <Link2 className="w-2.5 h-2.5 inline mr-1 opacity-60" />
                  {blTitle}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Wiki() {
  const [tree, setTree] = useState([])
  const [recent, setRecent] = useState([])
  const [selectedPath, setSelectedPath] = useState(null)
  const [article, setArticle] = useState(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [showCapture, setShowCapture] = useState(false)
  const [showIndex, setShowIndex] = useState(false)
  const [indexContent, setIndexContent] = useState('')
  const [treeLoading, setTreeLoading] = useState(true)
  const [articleLoading, setArticleLoading] = useState(false)

  const loadTree = async () => {
    setTreeLoading(true)
    try {
      const [tRes, rRes] = await Promise.all([
        axios.get('/api/wiki/tree'),
        axios.get('/api/wiki/recent'),
      ])
      setTree(tRes.data)
      setRecent(rRes.data)
    } finally {
      setTreeLoading(false)
    }
  }

  useEffect(() => { loadTree() }, [])

  const selectArticle = useCallback(async (path) => {
    setSelectedPath(path)
    setSearchResults(null)
    setSearch('')
    setShowIndex(false)
    setArticleLoading(true)
    try {
      const res = await axios.get('/api/wiki/article', { params: { path } })
      setArticle(res.data)
    } finally {
      setArticleLoading(false)
    }
  }, [])

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults(null); return }
    const res = await axios.get('/api/wiki/search', { params: { q } })
    setSearchResults(res.data)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const showWikiIndex = async () => {
    setSelectedPath(null)
    setArticle(null)
    setShowIndex(true)
    const res = await axios.get('/api/wiki/index')
    setIndexContent(res.data.content)
  }

  // Extract folders from tree
  const getFolders = (nodes, prefix = '') => {
    const folders = []
    for (const n of nodes) {
      if (n.type === 'folder') {
        const p = prefix ? `${prefix}/${n.name}` : n.name
        folders.push(p)
        folders.push(...getFolders(n.children || [], p))
      }
    }
    return folders
  }

  // Keyboard shortcut: Cmd+N for quick capture
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setShowCapture(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-full -m-6 min-h-0">
      {/* Sidebar */}
      <div className="w-60 shrink-0 border-r border-gray-800 bg-gray-950/50 flex flex-col h-full overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input className="input text-sm pl-8" data-search placeholder="Search... (⌘K)"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 px-3 py-2 border-b border-gray-800">
          <button className="btn-ghost text-xs flex-1 py-1.5" onClick={showWikiIndex}>
            <Home className="w-3.5 h-3.5" /> Index
          </button>
          <button className="btn-primary text-xs flex-1 py-1.5" onClick={() => setShowCapture(true)}>
            <Plus className="w-3.5 h-3.5" /> New (⌘N)
          </button>
        </div>

        {/* Recent */}
        {recent.length > 0 && !search && (
          <div className="px-3 pt-3">
            <div className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Recent
            </div>
            <div className="space-y-0.5">
              {recent.slice(0, 4).map((r, i) => (
                <div key={i}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${selectedPath === r.path ? 'bg-brand-500/20 text-brand-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                  onClick={() => selectArticle(r.path)}>
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{r.name}</span>
                </div>
              ))}
            </div>
            <div className="border-b border-gray-800 my-3" />
          </div>
        )}

        {/* File tree */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {!search && (
            <div className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-1.5">Articles</div>
          )}
          {treeLoading && !search && (
            <div className="space-y-1 mt-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-7 bg-gray-800/60 rounded-lg animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
              ))}
            </div>
          )}
          {!treeLoading && !search && tree.map((node, i) => (
            <TreeNode key={i} node={node} selectedPath={selectedPath} onSelect={selectArticle} />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8">
        {articleLoading ? (
          <div className="space-y-4 max-w-2xl">
            <div className="h-8 bg-gray-800/60 rounded-lg animate-pulse w-2/3" />
            <div className="h-4 bg-gray-800/40 rounded animate-pulse w-1/3" />
            <div className="mt-6 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-800/40 rounded animate-pulse" style={{ width: `${70 + (i % 4) * 8}%` }} />
              ))}
            </div>
          </div>
        ) : searchResults !== null ? (
          <div>
            <div className="text-sm text-gray-500 mb-4">{searchResults.length} results for "{search}"</div>
            <SearchResults results={searchResults} onSelect={(path) => { setSearch(''); selectArticle(path) }} />
          </div>
        ) : showIndex ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{indexContent}</ReactMarkdown>
          </div>
        ) : article ? (
          <ArticleView article={article} onClose={() => setArticle(null)} onUpdate={loadTree} onNavigate={selectArticle} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/30 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-xl font-semibold text-gray-300 mb-2">Your Wiki</div>
            <div className="text-gray-500 text-sm max-w-xs">
              Select an article from the sidebar, search for content, or create a new note with ⌘N.
            </div>
            <button className="btn-primary mt-6" onClick={showWikiIndex}>
              <Home className="w-4 h-4" /> View Index
            </button>
          </div>
        )}
      </div>

      {showCapture && (
        <QuickCapture
          folders={getFolders(tree)}
          onClose={() => setShowCapture(false)}
          onCreated={(path) => { setShowCapture(false); loadTree(); selectArticle(path) }}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import TradingWorkspace from './TradingWorkspace'
import StrategyComparison from './StrategyComparison'

export default function Trading() {
  const [view, setView] = useState('workspace')

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 pt-6 pb-0">
        <nav className="tabs">
          {[
            ['workspace', 'Trading Workspace'],
            ['strategy-comparison', 'Strategy Comparison'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`tab ${view === id ? 'tab-active text-cyan-400' : ''}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 min-h-0">
        {view === 'workspace' && <TradingWorkspace />}
        {view === 'strategy-comparison' && (
          <div className="h-full overflow-y-auto p-6">
            <StrategyComparison />
          </div>
        )}
      </div>
    </div>
  )
}

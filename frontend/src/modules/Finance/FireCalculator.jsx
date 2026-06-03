import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { Flame, Target, Calendar, TrendingUp, DollarSign, Percent, AlertCircle, CheckCircle2 } from 'lucide-react'

function fmt(n) {
  if (n == null) return '—'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString()}`
}

function fmtFull(n) {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

// Pure-JS FIRE calculation (instant, no API latency)
function calcFire({ currentPortfolio, monthlySavings, monthlyExpenses, annualReturnRate, withdrawalRate, targetYears }) {
  const monthlyR = (annualReturnRate / 100) / 12
  const annualExpenses = monthlyExpenses * 12
  const fiNumber = withdrawalRate > 0 ? annualExpenses / (withdrawalRate / 100) : 0

  let yearsToFi = null
  let fiDate = null

  if (fiNumber > 0) {
    if (currentPortfolio >= fiNumber) {
      yearsToFi = 0
    } else if (monthlyR === 0) {
      if (monthlySavings > 0) yearsToFi = (fiNumber - currentPortfolio) / monthlySavings / 12
    } else {
      let lo = 0, hi = 12 * 200
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2
        const factor = Math.pow(1 + monthlyR, mid)
        const fv = currentPortfolio * factor + monthlySavings * (factor - 1) / monthlyR
        if (fv >= fiNumber) hi = mid; else lo = mid
        if (hi - lo < 0.01) break
      }
      yearsToFi = hi / 12
      if (yearsToFi > 199) yearsToFi = null
    }
  }

  if (yearsToFi != null) {
    const monthsAway = Math.round(yearsToFi * 12)
    const now = new Date()
    const fiD = new Date(now.getFullYear(), now.getMonth() + monthsAway, 1)
    fiDate = fiD.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Monthly savings needed for target years
  let monthlySavingsNeeded = null
  const targetMonths = targetYears * 12
  if (fiNumber > 0 && targetMonths > 0) {
    if (monthlyR === 0) {
      monthlySavingsNeeded = Math.max(0, (fiNumber - currentPortfolio) / targetMonths)
    } else {
      const factor = Math.pow(1 + monthlyR, targetMonths)
      monthlySavingsNeeded = Math.max(0, (fiNumber - currentPortfolio * factor) * monthlyR / (factor - 1))
    }
  }

  // Year-by-year projection
  const capYears = Math.min(50, Math.ceil((yearsToFi || 30)) + 5)
  const projection = []
  let portfolio = currentPortfolio
  const currentYear = new Date().getFullYear()
  const fiReachYear = yearsToFi != null ? currentYear + Math.floor(yearsToFi) : null

  for (let yr = 0; yr <= capYears; yr++) {
    projection.push({
      year: currentYear + yr,
      portfolio: Math.round(portfolio),
      fiTarget: Math.round(fiNumber),
      reachedFi: portfolio >= fiNumber,
    })
    for (let m = 0; m < 12; m++) {
      portfolio = portfolio * (1 + monthlyR) + monthlySavings
    }
  }

  return { fiNumber, yearsToFi, fiDate, monthlySavingsNeeded, annualExpenses, projection, fiReachYear }
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const port = payload.find(p => p.dataKey === 'portfolio')
  const target = payload.find(p => p.dataKey === 'fiTarget')
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-gray-400 font-medium mb-2">{label}</p>
      {port && (
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="text-gray-400">Portfolio</span>
          <span className="font-semibold font-mono text-emerald-400">{fmt(port.value)}</span>
        </div>
      )}
      {target && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-400">FI Target</span>
          <span className="font-semibold font-mono text-orange-400">{fmt(target.value)}</span>
        </div>
      )}
    </div>
  )
}

function SliderInput({ label, icon: Icon, value, onChange, min, max, step, prefix = '', suffix = '', format }) {
  const display = format ? format(value) : `${prefix}${value.toLocaleString()}${suffix}`
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
          <label className="text-sm text-gray-300">{label}</label>
        </div>
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-28 text-right bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
        />
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
      />
      <div className="flex justify-between text-xs text-gray-600">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  )
}

export default function FireCalculator() {
  const [currentPortfolio, setCurrentPortfolio] = useState(150000)
  const [monthlySavings, setMonthlySavings] = useState(2000)
  const [monthlyExpenses, setMonthlyExpenses] = useState(4000)
  const [annualReturnRate, setAnnualReturnRate] = useState(7)
  const [withdrawalRate, setWithdrawalRate] = useState(4)
  const [targetYears, setTargetYears] = useState(20)

  const result = useMemo(() => calcFire({
    currentPortfolio, monthlySavings, monthlyExpenses,
    annualReturnRate, withdrawalRate, targetYears
  }), [currentPortfolio, monthlySavings, monthlyExpenses, annualReturnRate, withdrawalRate, targetYears])

  const onTrack = result.yearsToFi != null && result.yearsToFi <= targetYears
  const savingsGap = result.monthlySavingsNeeded != null
    ? result.monthlySavingsNeeded - monthlySavings
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-400" />
        <h2 className="text-lg font-semibold text-white">FIRE Calculator</h2>
        <span className="text-xs text-gray-500 ml-1">Financial Independence, Retire Early</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="card space-y-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Inputs</h3>

          <SliderInput
            label="Current Portfolio"
            icon={DollarSign}
            value={currentPortfolio}
            onChange={setCurrentPortfolio}
            min={0} max={2000000} step={5000}
            prefix="$"
          />
          <SliderInput
            label="Monthly Savings"
            icon={TrendingUp}
            value={monthlySavings}
            onChange={setMonthlySavings}
            min={0} max={20000} step={100}
            prefix="$"
          />
          <SliderInput
            label="Monthly Expenses (at FI)"
            icon={DollarSign}
            value={monthlyExpenses}
            onChange={setMonthlyExpenses}
            min={500} max={20000} step={100}
            prefix="$"
          />
          <SliderInput
            label="Expected Annual Return"
            icon={Percent}
            value={annualReturnRate}
            onChange={setAnnualReturnRate}
            min={1} max={15} step={0.5}
            suffix="%"
          />
          <SliderInput
            label="Safe Withdrawal Rate"
            icon={Percent}
            value={withdrawalRate}
            onChange={setWithdrawalRate}
            min={2} max={6} step={0.25}
            suffix="%"
          />
          <SliderInput
            label="Target Years to FI"
            icon={Calendar}
            value={targetYears}
            onChange={setTargetYears}
            min={1} max={50} step={1}
            suffix=" yrs"
          />
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* FI Number */}
          <div className="card bg-gradient-to-br from-orange-950/40 to-gray-900 border-orange-800/40">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">FI Number</p>
                <p className="text-3xl font-bold text-orange-400 font-mono">{fmt(result.fiNumber)}</p>
                <p className="text-xs text-gray-500 mt-1">{fmtFull(result.annualExpenses)}/yr ÷ {withdrawalRate}% SWR</p>
              </div>
              <Target className="w-8 h-8 text-orange-500/40" />
            </div>
          </div>

          {/* Years to FI + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Years to FI</p>
              <p className="text-2xl font-bold text-white font-mono">
                {result.yearsToFi != null ? result.yearsToFi.toFixed(1) : '∞'}
              </p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${onTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
                {onTrack
                  ? <><CheckCircle2 className="w-3 h-3" /> On track</>
                  : <><AlertCircle className="w-3 h-3" /> Behind target</>}
              </div>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">FI Date</p>
              <p className="text-lg font-bold text-white leading-tight mt-1">
                {result.fiDate ?? '—'}
              </p>
            </div>
          </div>

          {/* Savings Needed */}
          <div className={`card border ${onTrack ? 'border-emerald-800/40 bg-emerald-950/20' : 'border-amber-800/40 bg-amber-950/20'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Monthly Savings Needed for {targetYears}-yr Goal
                </p>
                <p className={`text-2xl font-bold font-mono ${onTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {fmtFull(result.monthlySavingsNeeded)}
                </p>
                {savingsGap != null && (
                  <p className={`text-xs mt-1 ${savingsGap <= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {savingsGap <= 0
                      ? `${fmtFull(Math.abs(savingsGap))}/mo surplus`
                      : `${fmtFull(savingsGap)}/mo gap`}
                  </p>
                )}
              </div>
              {onTrack
                ? <CheckCircle2 className="w-7 h-7 text-emerald-500/50 mt-1" />
                : <AlertCircle className="w-7 h-7 text-amber-500/50 mt-1" />}
            </div>
          </div>

          {/* Progress bar */}
          {result.fiNumber > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Current Progress</p>
                <p className="text-xs font-mono text-gray-300">
                  {Math.min(100, (currentPortfolio / result.fiNumber * 100)).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, currentPortfolio / result.fiNumber * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>{fmt(currentPortfolio)}</span>
                <span>{fmt(result.fiNumber)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Projection Chart */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Portfolio Projection</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={result.projection} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              tickFormatter={v => fmt(v)}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={(value) => value === 'portfolio' ? 'Portfolio Value' : 'FI Target'}
            />
            {result.fiReachYear && (
              <ReferenceLine
                x={result.fiReachYear}
                stroke="#f97316"
                strokeDasharray="4 3"
                label={{ value: 'FI ✓', fill: '#f97316', fontSize: 11, position: 'top' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="fiTarget"
              stroke="#f97316"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="none"
              dot={false}
              name="fiTarget"
            />
            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#portfolioGrad)"
              dot={false}
              name="portfolio"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Assumptions note */}
      <p className="text-xs text-gray-600">
        Assumes constant {annualReturnRate}% annual return (nominal), constant monthly savings of {fmtFull(monthlySavings)},
        and {withdrawalRate}% safe withdrawal rate. Does not account for inflation, taxes, or variable returns.
        Results are illustrative, not financial advice.
      </p>
    </div>
  )
}

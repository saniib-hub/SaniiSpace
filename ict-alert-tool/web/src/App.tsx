import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatCards } from '@/components/StatCards'
import { TradesTable } from '@/components/TradesTable'
import { TradeChart } from '@/components/TradeChart'
import { VerificationPanel } from '@/components/VerificationPanel'
import { LiveMonitorPanel } from '@/components/LiveMonitorPanel'
import { api, type Candle, type Summary, type Trade } from '@/api/client'

type InstrumentFilter = 'ALL' | 'EURUSD' | 'GBPUSD'
type BiasFilter = 'all' | 'aligned'
type TargetFilter = '2r' | '3r'

function App() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [candlesByInstrument, setCandlesByInstrument] = useState<Record<string, Candle[]>>({})
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [instrument, setInstrument] = useState<InstrumentFilter>('ALL')
  const [bias, setBias] = useState<BiasFilter>('all')
  const [target, setTarget] = useState<TargetFilter>('2r')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.summary().then(setSummary).catch((e) => setError(String(e)))
    api.trades().then(setTrades).catch((e) => setError(String(e)))
    api.instruments().then((insts) => {
      insts.forEach((inst) => {
        api.candles(inst).then((c) => setCandlesByInstrument((prev) => ({ ...prev, [inst]: c })))
      })
    })
  }, [])

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (instrument !== 'ALL' && t.instrument !== instrument) return false
      if (bias === 'aligned' && !t.bias_aligned) return false
      return true
    })
  }, [trades, instrument, bias])

  const statBlock = useMemo(() => {
    if (!summary) return null
    const scope = instrument === 'ALL' ? summary.combined : summary.by_instrument[instrument]
    if (!scope) return null
    const biasScope = bias === 'aligned' ? scope.bias_aligned : scope.all
    return biasScope[target]
  }, [summary, instrument, bias, target])

  const candlesForSelected = selectedTrade ? candlesByInstrument[selectedTrade.instrument] : undefined

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">ICT 2022 Model + TTrades — Alert Tool</h1>
        <p className="text-sm text-muted-foreground">
          Sweep → market structure shift → displacement → OTE retracement, backtested on daily
          EUR/USD and GBP/USD bars and independently verified against raw OHLC.
        </p>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="trades">Trades &amp; Charts</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="live">Live Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={instrument} onValueChange={(v) => setInstrument(v as InstrumentFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All instruments</SelectItem>
                <SelectItem value="EURUSD">EUR/USD</SelectItem>
                <SelectItem value="GBPUSD">GBP/USD</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bias} onValueChange={(v) => setBias(v as BiasFilter)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All setups</SelectItem>
                <SelectItem value="aligned">Bias-aligned only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={target} onValueChange={(v) => setTarget(v as TargetFilter)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2r">2R target</SelectItem>
                <SelectItem value="3r">3R target</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {statBlock && (
            <StatCards
              title={`${instrument === 'ALL' ? 'Combined' : instrument} — ${bias === 'aligned' ? 'bias-aligned' : 'all'} setups (${target.toUpperCase()} target)`}
              stats={statBlock}
            />
          )}

          <p className="text-xs text-muted-foreground">
            Small sample (8 trades over ~100 days across two pairs) — directionally promising, not
            statistically conclusive. See the Verification tab for the independent audit of every
            number below.
          </p>
        </TabsContent>

        <TabsContent value="trades" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={instrument} onValueChange={(v) => setInstrument(v as InstrumentFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All instruments</SelectItem>
                <SelectItem value="EURUSD">EUR/USD</SelectItem>
                <SelectItem value="GBPUSD">GBP/USD</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bias} onValueChange={(v) => setBias(v as BiasFilter)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All setups</SelectItem>
                <SelectItem value="aligned">Bias-aligned only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TradesTable trades={filteredTrades} selected={selectedTrade} onSelect={setSelectedTrade} />

          {selectedTrade && candlesForSelected && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-medium mb-2">
                {selectedTrade.instrument} {selectedTrade.direction.toUpperCase()} — sweep{' '}
                {selectedTrade.sweep_date} → MSS {selectedTrade.mss_date} → entry{' '}
                {selectedTrade.entry_date}
              </h3>
              <TradeChart candles={candlesForSelected} trade={selectedTrade} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="verification" className="pt-4">
          <VerificationPanel />
        </TabsContent>

        <TabsContent value="live" className="pt-4">
          <LiveMonitorPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default App

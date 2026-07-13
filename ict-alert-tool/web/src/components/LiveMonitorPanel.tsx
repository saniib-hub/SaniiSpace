import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { api, type LiveCheckResult, type JournalAlert } from '@/api/client'
import { cn } from '@/lib/utils'

interface LiveInstrument {
  symbol: string
  label: string
  has_backtest: boolean
}

const JOURNAL_TAG_LABEL: Record<string, string> = {
  armed: 'ARMED', entry_triggered: 'ENTRY', stop_hit: 'STOP',
  target_2r_hit: '2R TARGET', target_3r_hit: '3R TARGET',
  invalidated: 'INVALIDATED', expired: 'EXPIRED', closed_max_hold: 'MAX HOLD',
}

export function LiveMonitorPanel() {
  const [apiKey, setApiKey] = useState('')
  const [accountId, setAccountId] = useState('')
  const [practice, setPractice] = useState(true)
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)
  const [checkResult, setCheckResult] = useState<LiveCheckResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [available, setAvailable] = useState<LiveInstrument[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(['EURUSD', 'GBPUSD']))
  const [journalEntries, setJournalEntries] = useState<JournalAlert[] | null>(null)
  const [journalError, setJournalError] = useState<string | null>(null)

  useEffect(() => {
    api.liveStatus().then(setStatus).catch((e) => setError(String(e)))
    api.liveInstruments().then(setAvailable).catch((e) => setError(String(e)))
  }, [])

  function toggleInstrument(symbol: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  async function saveConfig() {
    setBusy(true)
    setError(null)
    try {
      const s = await api.liveConfig({
        api_key: apiKey,
        account_id: accountId,
        practice,
        instruments: Array.from(selected),
      })
      setStatus(s)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function runCheck() {
    setBusy(true)
    setError(null)
    try {
      const r = await api.liveCheck()
      setCheckResult(r)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function loadJournal() {
    setJournalError(null)
    try {
      setJournalEntries(await api.journalAlerts(undefined, 100))
    } catch (e) {
      setJournalError(String(e))
    }
  }

  const configured = Boolean(status?.configured)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Live monitor (OANDA)</CardTitle>
          <CardDescription>
            Requires your own OANDA API key (free practice account). Data never leaves this
            browser/server pair -- the key is held in memory only, not written to disk.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={configured ? 'success' : 'secondary'}>
              {configured ? 'configured' : 'not configured'}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="api-key">OANDA API key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="paste your v20 API token"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-id">Account ID</Label>
              <Input
                id="account-id"
                placeholder="e.g. 101-004-1234567-001"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="practice" checked={practice} onCheckedChange={setPractice} />
            <Label htmlFor="practice">Practice account (uncheck for live trading account)</Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Instruments to watch</Label>
            <div className="flex flex-wrap gap-2">
              {available.map((inst) => {
                const isSelected = selected.has(inst.symbol)
                return (
                  <button
                    key={inst.symbol}
                    type="button"
                    onClick={() => toggleInstrument(inst.symbol)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground hover:bg-accent',
                    )}
                    title={inst.has_backtest ? 'Has verified backtest history' : 'Live-only, no backtest history yet'}
                  >
                    {inst.label}
                    {!inst.has_backtest && <span className="ml-1 opacity-60">(live-only)</span>}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              "Live-only" instruments have no verified backtest history yet (see Dashboard/Trades
              tabs) -- they'll still get real ARMED/ENTRY/STOP/TARGET alerts once this is
              configured and deployed with real OANDA access.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={busy || !apiKey}>
              Save configuration
            </Button>
            <Button onClick={runCheck} variant="outline" disabled={busy || !configured}>
              Check now
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {Boolean(status?.scope_note) && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              {String(status?.scope_note)}
            </p>
          )}
        </CardContent>
      </Card>

      {checkResult && checkResult.status === 'OK' && (
        <Card>
          <CardHeader>
            <CardTitle>Possible entries</CardTitle>
            <CardDescription>{checkResult.note}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(checkResult.results ?? []).map((r) => (
              <div key={r.instrument} className="flex flex-col gap-2">
                {r.error && (
                  <p className="text-sm text-destructive">{r.instrument}: {r.error}</p>
                )}
                {r.possible_entries && r.possible_entries.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {r.instrument}: no confirmed pattern pending right now (checked {r.bars_seen} bars).
                  </p>
                )}
                {r.possible_entries?.map((e, i) => (
                  <div key={i} className="rounded-md border p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{e.instrument}</span>
                      <Badge variant={e.direction === 'long' ? 'success' : 'destructive'}>{e.direction}</Badge>
                      <Badge variant="default">high-probability entry</Badge>
                      {e.bias_aligned && <Badge variant="secondary">bias-aligned</Badge>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Entry zone</div>
                        <div className="tabular-nums">{e.entry_zone[0].toFixed(5)} – {e.entry_zone[1].toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Stop loss</div>
                        <div className="tabular-nums text-destructive font-medium">{e.stop.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Take profit (2R)</div>
                        <div className="tabular-nums text-success font-medium">{e.target_2r.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Take profit (3R)</div>
                        <div className="tabular-nums text-success font-medium">{e.target_3r.toFixed(5)}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      sweep {e.sweep_date} → MSS {e.mss_date}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {checkResult && checkResult.status === 'NOT_CONFIGURED' && (
        <p className="text-sm text-destructive">{checkResult.message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Journal</CardTitle>
          <CardDescription>
            A persisted record of the market's movement and every scan result over time --
            survives restarts, unlike the live feed. Not a trade or order log: nothing here is a
            real broker order, since this tool doesn't place trades.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={loadJournal} variant="outline" className="self-start">
            Load journal
          </Button>
          {journalError && <p className="text-sm text-destructive">{journalError}</p>}
          {journalEntries && journalEntries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No recorded scan history yet -- run "Check now" (or let the background poller run
              during a kill zone) to start building one.
            </p>
          )}
          {journalEntries && journalEntries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pr-3 py-1">Recorded</th>
                    <th className="pr-3 py-1">Type</th>
                    <th className="pr-3 py-1">Instrument</th>
                    <th className="pr-3 py-1">Dir</th>
                    <th className="pr-3 py-1">Date</th>
                    <th className="py-1">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {journalEntries.map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="pr-3 py-1 whitespace-nowrap text-xs text-muted-foreground">{e.recorded_at}</td>
                      <td className="pr-3 py-1 whitespace-nowrap">
                        <Badge variant="secondary">{JOURNAL_TAG_LABEL[e.type] ?? e.type}</Badge>
                      </td>
                      <td className="pr-3 py-1 whitespace-nowrap font-medium">{e.instrument}</td>
                      <td className="pr-3 py-1 whitespace-nowrap text-muted-foreground">{e.direction}</td>
                      <td className="pr-3 py-1 whitespace-nowrap">{e.date}</td>
                      <td className="py-1 text-muted-foreground">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

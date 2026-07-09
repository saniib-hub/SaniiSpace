import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/client'

export function LiveMonitorPanel() {
  const [apiKey, setApiKey] = useState('')
  const [accountId, setAccountId] = useState('')
  const [practice, setPractice] = useState(true)
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)
  const [checkResult, setCheckResult] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.liveStatus().then(setStatus).catch((e) => setError(String(e)))
  }, [])

  async function saveConfig() {
    setBusy(true)
    setError(null)
    try {
      const s = await api.liveConfig({
        api_key: apiKey,
        account_id: accountId,
        practice,
        instruments: ['EURUSD', 'GBPUSD'],
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

      {checkResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last check result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-x-auto bg-muted rounded-md p-3">
              {JSON.stringify(checkResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

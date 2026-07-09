import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, subscribeAlerts, type AlertEvent } from '@/api/client'
import { cn } from '@/lib/utils'

const NOTIFY_WORTHY = new Set([
  'armed', 'entry_triggered', 'invalidated', 'expired',
  'stop_hit', 'target_2r_hit', 'target_3r_hit', 'closed_max_hold',
])

const TYPE_STYLE: Record<string, { label: string; badge: 'default' | 'secondary' | 'destructive' | 'success' }> = {
  armed: { label: 'ARMED', badge: 'default' },
  entry_triggered: { label: 'ENTRY', badge: 'default' },
  stop_hit: { label: 'STOP', badge: 'destructive' },
  target_2r_hit: { label: '2R TARGET', badge: 'success' },
  target_3r_hit: { label: '3R TARGET', badge: 'success' },
  invalidated: { label: 'INVALIDATED', badge: 'secondary' },
  expired: { label: 'EXPIRED', badge: 'secondary' },
  closed_max_hold: { label: 'MAX HOLD', badge: 'secondary' },
}

function notify(e: AlertEvent) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const style = TYPE_STYLE[e.type]
  new Notification(`${e.instrument} ${e.direction ? e.direction.toUpperCase() : ''} ${style?.label ?? e.type}`.trim(), {
    body: e.message,
  })
}

export function AlertsPanel() {
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const [instrument, setInstrument] = useState('EURUSD')
  const [speed, setSpeed] = useState('150')
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null)
  const [running, setRunning] = useState(false)
  const unsubRef = useRef<() => void>(() => {})

  useEffect(() => {
    unsubRef.current = subscribeAlerts((e) => {
      if (e.type === 'replay_tick') {
        const d = e.data as { index: number; total: number }
        setProgress({ index: d.index, total: d.total })
        return
      }
      if (e.type === 'replay_status') {
        const status = (e.data as { status: string }).status
        setRunning(status === 'started')
        if (status === 'complete' || status === 'stopped') setProgress(null)
      }
      setEvents((prev) => [e, ...prev].slice(0, 300))
      if (NOTIFY_WORTHY.has(e.type)) notify(e)
    })
    return () => unsubRef.current()
  }, [])

  async function requestPermission() {
    if (typeof Notification === 'undefined') return
    const p = await Notification.requestPermission()
    setPermission(p)
  }

  async function startReplay() {
    setEvents([])
    setProgress({ index: 0, total: 1 })
    await api.replayStart(instrument, Number(speed))
  }

  async function stopReplay() {
    await api.replayStop(instrument)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>
            Fires on every stage: setup ARMED (sweep + MSS confirmed, entry zone known), ENTRY
            triggered, STOP hit, and 2R / 3R TARGET hit. Run the demo replay below to see it work
            against the verified historical data -- no OANDA key needed. Once Live Monitor is
            configured, the same feed carries real alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={permission === 'granted' ? 'success' : 'secondary'}>
              notifications: {permission}
            </Badge>
            {permission !== 'granted' && (
              <Button size="sm" variant="outline" onClick={requestPermission}>
                Enable browser notifications
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={instrument} onValueChange={setInstrument} disabled={running}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EURUSD">EUR/USD</SelectItem>
                <SelectItem value="GBPUSD">GBP/USD</SelectItem>
              </SelectContent>
            </Select>
            <Select value={speed} onValueChange={setSpeed} disabled={running}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="400">Slow</SelectItem>
                <SelectItem value="150">Normal</SelectItem>
                <SelectItem value="30">Fast</SelectItem>
              </SelectContent>
            </Select>
            {!running ? (
              <Button onClick={startReplay}>Start demo replay</Button>
            ) : (
              <Button onClick={stopReplay} variant="destructive">Stop</Button>
            )}
            {progress && (
              <span className="text-xs text-muted-foreground">
                bar {progress.index + 1} / {progress.total}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live feed</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">No alerts yet -- start a demo replay above.</p>
          )}
          <ul className="flex flex-col gap-2 max-h-[32rem] overflow-y-auto">
            {events.map((e, i) => {
              const style = TYPE_STYLE[e.type]
              if (!style) return null
              return (
                <li
                  key={i}
                  className={cn(
                    'flex flex-col gap-1 rounded-md border p-3 text-sm',
                    e.type === 'stop_hit' && 'border-destructive/40',
                    (e.type === 'target_2r_hit' || e.type === 'target_3r_hit') && 'border-success/40',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={style.badge}>{style.label}</Badge>
                    <span className="font-medium">{e.instrument}</span>
                    {e.direction && <span className="text-muted-foreground">{e.direction}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">{e.date}</span>
                  </div>
                  <p className="text-muted-foreground">{e.message}</p>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

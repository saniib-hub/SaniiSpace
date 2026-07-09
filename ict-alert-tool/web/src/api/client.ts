const BASE = '/api'

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface Trade {
  instrument: string
  direction: 'long' | 'short'
  bias_aligned: boolean
  sweep_date: string
  sweep_price: number
  mss_date: string
  mss_price: number
  entry_date: string
  entry_price: number
  stop: number
  target_2r: number
  target_3r: number
  exit_date_2r: string
  exit_price_2r: number | null
  result_r_2r: number
  exit_date_3r: string
  exit_price_3r: number | null
  result_r_3r: number
}

export interface StatBlock {
  trades: number
  wins: number
  losses: number
  win_rate: number
  avg_r: number
  total_r: number
  profit_factor: number
  max_drawdown_r: number
}

export interface InstrumentSummary {
  all: { '2r': StatBlock; '3r': StatBlock }
  bias_aligned: { '2r': StatBlock; '3r': StatBlock }
}

export interface Summary {
  by_instrument: Record<string, InstrumentSummary>
  combined: InstrumentSummary
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  return res.json()
}

export const api = {
  instruments: () => getJSON<string[]>('/instruments'),
  summary: () => getJSON<Summary>('/summary'),
  trades: (instrument?: string, biasAligned?: boolean) => {
    const params = new URLSearchParams()
    if (instrument) params.set('instrument', instrument)
    if (biasAligned !== undefined) params.set('bias_aligned', String(biasAligned))
    const qs = params.toString()
    return getJSON<Trade[]>(`/trades${qs ? `?${qs}` : ''}`)
  },
  candles: (instrument: string) => getJSON<Candle[]>(`/candles/${instrument}`),
  verification: () => getJSON<{ report_markdown: string }>('/verification'),
  liveStatus: () => getJSON<Record<string, unknown>>('/live/status'),
  liveConfig: (body: { api_key: string; account_id: string; practice: boolean; instruments: string[] }) =>
    fetch(`${BASE}/live/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  liveCheck: () => fetch(`${BASE}/live/check`, { method: 'POST' }).then((r) => r.json()),
  replayStart: (instrument: string, speedMs: number) =>
    fetch(`${BASE}/replay/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instrument, speed_ms: speedMs }),
    }).then((r) => r.json()),
  replayStop: (instrument: string) =>
    fetch(`${BASE}/replay/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instrument }),
    }).then((r) => r.json()),
}

export interface AlertEvent {
  type: string
  instrument: string
  direction: string
  date: string
  setup_id: string
  message: string
  data: Record<string, unknown>
}

export function subscribeAlerts(onEvent: (e: AlertEvent) => void): () => void {
  const es = new EventSource(`${BASE}/alerts/stream`)
  es.onmessage = (ev) => {
    try {
      onEvent(JSON.parse(ev.data))
    } catch {
      // ignore malformed/keepalive lines
    }
  }
  return () => es.close()
}

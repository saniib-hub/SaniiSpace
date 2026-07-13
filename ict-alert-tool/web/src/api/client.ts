// In local dev the Vite proxy forwards relative '/api' calls to the backend
// (see vite.config.ts). In production the frontend and API are deployed as
// separate services on different origins, so a build-time env var supplies
// the API's absolute URL instead.
const BASE = `${import.meta.env.VITE_API_BASE ?? ''}/api`

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface PossibleEntry {
  instrument: string
  direction: 'long' | 'short'
  sweep_date: string
  sweep_price: number
  mss_date: string
  mss_price: number
  entry_zone: [number, number]
  entry_price: number
  stop: number
  target_2r: number
  target_3r: number
  bias_aligned: boolean
}

export interface LiveCheckResult {
  status: 'NOT_CONFIGURED' | 'OK'
  message?: string
  note?: string
  results?: {
    instrument: string
    error?: string
    possible_entries?: PossibleEntry[]
    bars_seen?: number
  }[]
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
  liveInstruments: () => getJSON<{ symbol: string; label: string; has_backtest: boolean }[]>('/live/instruments'),
  liveStatus: () => getJSON<Record<string, unknown>>('/live/status'),
  liveConfig: (body: { api_key: string; account_id: string; practice: boolean; instruments: string[] }) =>
    fetch(`${BASE}/live/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  liveCheck: () => fetch(`${BASE}/live/check`, { method: 'POST' }).then((r) => r.json() as Promise<LiveCheckResult>),
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
  journalCandles: (instrument: string, limit = 500) =>
    getJSON<Candle[]>(`/live/journal/candles/${instrument}?limit=${limit}`),
  journalAlerts: (instrument?: string, limit = 200) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (instrument) params.set('instrument', instrument)
    return getJSON<JournalAlert[]>(`/live/journal/alerts?${params.toString()}`)
  },
}

export interface JournalAlert {
  type: string
  instrument: string
  direction: string
  date: string
  setup_id: string
  message: string
  data: Record<string, unknown>
  recorded_at: string
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

import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle, Trade } from '@/api/client'

function toTime(date: string): UTCTimestamp {
  return (new Date(`${date}T00:00:00Z`).getTime() / 1000) as UTCTimestamp
}

export function TradeChart({ candles, trade }: { candles: Candle[]; trade: Trade }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isDark = document.documentElement.classList.contains('dark') ||
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const textColor = isDark ? '#9ca3af' : '#4b5563'
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

    const chart = createChart(container, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor, timeVisible: false },
      crosshair: { mode: 0 },
    })
    chartRef.current = chart

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })
    seriesRef.current = series

    // Zoom the visible window to roughly the setup window +/- padding.
    const relevantDates = [trade.sweep_date, trade.entry_date, trade.exit_date_2r].filter(Boolean)
    const idxs = relevantDates
      .map((d) => candles.findIndex((c) => c.date === d))
      .filter((i) => i >= 0)
    const lo = Math.max(0, Math.min(...idxs) - 8)
    const hi = Math.min(candles.length - 1, Math.max(...idxs) + 8)
    const windowed = candles.slice(lo, hi + 1)

    series.setData(
      windowed.map((c) => ({
        time: toTime(c.date),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )

    const lines = [
      { price: trade.sweep_price, color: '#a78bfa', title: 'sweep' },
      { price: trade.mss_price, color: '#3b82f6', title: 'MSS close' },
      { price: trade.entry_price, color: '#f59e0b', title: 'entry (OTE)' },
      { price: trade.stop, color: '#ef4444', title: 'stop' },
      { price: trade.target_2r, color: '#22c55e', title: '2R target' },
      { price: trade.target_3r, color: '#16a34a', title: '3R target' },
    ]
    const priceLines = lines.map((l) =>
      series.createPriceLine({
        price: l.price,
        color: l.color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: l.title,
      }),
    )

    createSeriesMarkers(series, [
      { time: toTime(trade.sweep_date), position: 'belowBar', color: '#a78bfa', shape: 'arrowUp', text: 'sweep' },
      { time: toTime(trade.mss_date), position: 'aboveBar', color: '#3b82f6', shape: 'circle', text: 'MSS' },
      { time: toTime(trade.entry_date), position: 'aboveBar', color: '#f59e0b', shape: 'arrowDown', text: 'entry' },
    ])

    const resizeObserver = new ResizeObserver(() => chart.timeScale().fitContent())
    resizeObserver.observe(container)
    chart.timeScale().fitContent()

    return () => {
      resizeObserver.disconnect()
      priceLines.forEach((pl) => series.removePriceLine(pl))
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [candles, trade])

  return <div ref={containerRef} className="h-80 w-full" />
}

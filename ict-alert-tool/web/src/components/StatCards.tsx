import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StatBlock } from '@/api/client'
import { cn } from '@/lib/utils'

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-xl font-semibold tabular-nums',
          tone === 'good' && 'text-success',
          tone === 'bad' && 'text-destructive',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function StatCards({ title, stats }: { title: string; stats: StatBlock }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <Stat label="Trades" value={String(stats.trades)} />
        <Stat label="Win rate" value={`${stats.win_rate.toFixed(1)}%`} tone={stats.win_rate >= 50 ? 'good' : 'bad'} />
        <Stat label="Avg R" value={stats.avg_r.toFixed(2)} tone={stats.avg_r >= 0 ? 'good' : 'bad'} />
        <Stat label="Total R" value={stats.total_r.toFixed(2)} tone={stats.total_r >= 0 ? 'good' : 'bad'} />
        <Stat label="Profit factor" value={stats.profit_factor.toFixed(2)} />
        <Stat label="Max drawdown" value={`${stats.max_drawdown_r.toFixed(2)}R`} tone="bad" />
      </CardContent>
    </Card>
  )
}

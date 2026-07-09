import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Trade } from '@/api/client'

export function TradesTable({
  trades,
  selected,
  onSelect,
}: {
  trades: Trade[]
  selected: Trade | null
  onSelect: (t: Trade) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Instrument</TableHead>
          <TableHead>Dir</TableHead>
          <TableHead>Bias</TableHead>
          <TableHead>Sweep</TableHead>
          <TableHead>MSS</TableHead>
          <TableHead>Entry</TableHead>
          <TableHead>Stop</TableHead>
          <TableHead>2R result</TableHead>
          <TableHead>3R result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((t, i) => (
          <TableRow
            key={`${t.instrument}-${t.direction}-${t.entry_date}-${i}`}
            className={cn(
              'cursor-pointer',
              selected === t && 'bg-accent',
            )}
            onClick={() => onSelect(t)}
          >
            <TableCell className="font-medium">{t.instrument}</TableCell>
            <TableCell>
              <Badge variant={t.direction === 'long' ? 'success' : 'destructive'}>{t.direction}</Badge>
            </TableCell>
            <TableCell>{t.bias_aligned ? 'aligned' : 'counter'}</TableCell>
            <TableCell>{t.sweep_date}</TableCell>
            <TableCell>{t.mss_date}</TableCell>
            <TableCell>{t.entry_date}</TableCell>
            <TableCell>{t.stop.toFixed(5)}</TableCell>
            <TableCell className={t.result_r_2r > 0 ? 'text-success' : 'text-destructive'}>
              {t.result_r_2r > 0 ? '+' : ''}
              {t.result_r_2r.toFixed(2)}R
            </TableCell>
            <TableCell className={t.result_r_3r > 0 ? 'text-success' : 'text-destructive'}>
              {t.result_r_3r > 0 ? '+' : ''}
              {t.result_r_3r.toFixed(2)}R
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

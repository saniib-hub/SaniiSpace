import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/api/client'

export function VerificationPanel() {
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .verification()
      .then((r) => setReport(r.report_markdown))
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Independent verification report</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {report && (
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-muted rounded-md p-4">
            {report}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}

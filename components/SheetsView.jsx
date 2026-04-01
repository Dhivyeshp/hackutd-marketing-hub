import { useEffect, useState } from 'react'
import { Button } from './ui/button'

export default function SheetsView() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState('')

  useEffect(() => {
    fetch('/api/sheets')
      .then(r => r.json())
      .then(d => {
        setRows(d.data || [])
        setLoading(false)
      })
      .catch(e => {
        setError('Failed to load sheet data')
        setLoading(false)
      })
  }, [])

  async function createClickUpTask(row) {
    setCreating(row['Timestamp'] || row['Name'] || '...')
    try {
      const res = await fetch('/api/clickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${row['Name']}: ${row['What do you need?']}`,
          team: (row['Team'] || '').toLowerCase(),
          due: row['When do you need it by?']
        })
      })
      if (!res.ok) throw new Error('Failed to create ClickUp task')
      alert('ClickUp task created!')
    } catch (e) {
      alert(e.message)
    } finally {
      setCreating('')
    }
  }

  if (loading) return <div>Loading sheet data...</div>
  if (error) return <div className="text-red-500">{error}</div>

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          <tr>
            {rows[0] && Object.keys(rows[0]).map(key => (
              <th key={key} className="border px-2 py-1 bg-gray-100">{key}</th>
            ))}
            <th className="border px-2 py-1 bg-gray-100">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((val, j) => (
                <td key={j} className="border px-2 py-1">{val}</td>
              ))}
              <td className="border px-2 py-1">
                <Button
                  size="sm"
                  disabled={!!creating}
                  onClick={() => createClickUpTask(row)}
                >
                  {creating === (row['Timestamp'] || row['Name'] || '...') ? 'Creating...' : 'Create ClickUp Task'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

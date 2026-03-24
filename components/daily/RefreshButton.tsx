'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRefresh() {
    setLoading(true)
    try {
      await fetch('/api/daily-reading/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
    >
      <span className={loading ? 'animate-spin' : ''}>↻</span>
      {loading ? 'Generating…' : 'Refresh'}
    </button>
  )
}

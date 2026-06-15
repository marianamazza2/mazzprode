import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function Ranking() {
  const [rows, setRows] = useState(null) // null = cargando
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Leemos de la view "leaderboard" (nunca expone email) para que
      // funcione con RLS activado.
      const [boardRes, resultsRes] = await Promise.all([
        supabase
          .from('leaderboard')
          .select('instagram, name, points, final_goals, created_at'),
        supabase.from('results').select('final_goals').eq('id', 1).single(),
      ])

      if (boardRes.error || resultsRes.error) {
        setError('No pudimos cargar el ranking. Recargá la página.')
        return
      }

      const realGoals = resultsRes.data?.final_goals

      const sorted = [...boardRes.data].sort((a, b) => {
        // 1) mayor puntaje primero
        if (b.points !== a.points) return b.points - a.points
        // 2) menor diferencia con los goles reales de la final (si ya se jugó)
        if (realGoals != null) {
          const diffA = Math.abs(a.final_goals - realGoals)
          const diffB = Math.abs(b.final_goals - realGoals)
          if (diffA !== diffB) return diffA - diffB
        }
        // 3) quien cargó primero gana
        return new Date(a.created_at) - new Date(b.created_at)
      })

      setRows(sorted)
    }
    load()
  }, [])

  return (
    <main className="min-h-screen bg-ink px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <header className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cream/70">
            MazzMKT · Mundial 2026
          </p>
          <h1 className="mt-2 text-4xl font-bold text-cream">Ranking</h1>
        </header>

        <div className="mt-8 border-t border-cream/20">
          {error && (
            <p className="py-8 text-center text-sm text-white/70">{error}</p>
          )}

          {!error && rows === null && (
            <p className="py-8 text-center text-sm text-white/50">Cargando…</p>
          )}

          {!error && rows?.length === 0 && (
            <p className="py-8 text-center text-sm text-white/70">
              Todavía no hay pronósticos cargados.
            </p>
          )}

          {!error &&
            rows?.map((row, index) => {
              const position = index + 1
              const ig = row.instagram?.trim()
              const handle = ig
                ? ig.startsWith('@')
                  ? ig
                  : `@${ig}`
                : row.name
              return (
                <div
                  key={`${handle}-${index}`}
                  className="flex items-center gap-4 border-b border-cream/10 py-3.5"
                >
                  <span className="w-9 shrink-0 text-center text-lg font-bold text-cream/80">
                    {medals[position] ?? position}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base text-white">
                    {handle}
                  </span>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-white">
                    {row.points}
                    <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.15em] text-cream/60">
                      pts
                    </span>
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    </main>
  )
}

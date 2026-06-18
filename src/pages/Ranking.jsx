import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
const PAGE_SIZE = 7

export default function Ranking() {
  const [rows, setRows] = useState(null) // null = cargando
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [ready, setReady] = useState(null) // null = aún no sabemos

  useEffect(() => {
    async function load() {
      // Leemos de la view "leaderboard" (nunca expone email) para que
      // funcione con RLS activado.
      const [boardRes, resultsRes] = await Promise.all([
        supabase
          .from('leaderboard')
          .select('instagram, name, points, final_goals, created_at'),
        supabase
          .from('results')
          .select('final_goals, semifinalists, champion_id')
          .eq('id', 1)
          .single(),
      ])

      if (boardRes.error || resultsRes.error) {
        setError('No pudimos cargar el ranking. Recarga la página.')
        return
      }

      // El ranking solo es significativo una vez que hay resultados cargados.
      const res = resultsRes.data
      setReady(res?.semifinalists?.length > 0 || res?.champion_id != null)

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

  const totalPages = rows ? Math.ceil(rows.length / PAGE_SIZE) : 0
  const pageRows = rows ? rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) : []

  return (
    <main className="min-h-screen bg-ink px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="relative flex items-center justify-center">
          <a
            href="/"
            aria-label="Atrás"
            className="absolute left-0 -ml-1.5 flex h-9 w-9 items-center justify-center rounded-full text-cream/80 transition hover:bg-white/10 hover:text-cream"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a>
          <p className="text-center text-[11px] uppercase tracking-[0.3em] text-cream/70">
            MazzMKT · Mundial 2026
          </p>
        </div>

        <header className="mt-6 text-center">
          <h1 className="text-4xl font-bold text-cream">Ranking</h1>
        </header>

        <div className="mt-8 border-t border-cream/20">
          {error && (
            <p className="py-8 text-center text-sm text-white/70">{error}</p>
          )}

          {!error && rows === null && (
            <div className="flex flex-col items-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/25 border-t-cream" />
              <p className="mt-4 text-sm text-white/50">Cargando ranking…</p>
            </div>
          )}

          {!error && ready === false && (
            <p className="py-12 text-center text-sm text-white/70">
              El ranking estará disponible cuando arranque la fase final.
            </p>
          )}

          {!error && ready && rows?.length === 0 && (
            <p className="py-8 text-center text-sm text-white/70">
              Todavía no hay pronósticos cargados.
            </p>
          )}

          {!error &&
            ready &&
            pageRows.map((row, index) => {
              const position = page * PAGE_SIZE + index + 1
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

        {!error && ready && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Página anterior"
              className="text-2xl leading-none text-cream/70 transition hover:text-cream disabled:cursor-default disabled:opacity-20"
            >
              ←
            </button>
            <span className="text-xs uppercase tracking-[0.2em] text-cream/50 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Página siguiente"
              className="text-2xl leading-none text-cream/70 transition hover:text-cream disabled:cursor-default disabled:opacity-20"
            >
              →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

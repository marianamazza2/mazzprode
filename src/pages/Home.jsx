import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/* Balón = emoji real, integrado a la paleta */
function Ball({ className }) {
  return (
    <span className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      ⚽
    </span>
  )
}

/* Trofeo en línea */
function Trophy({ className }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 6h20v9a10 10 0 0 1-20 0V6Z" />
      <path d="M14 10H8a5 5 0 0 0 6 8" />
      <path d="M34 10h6a5 5 0 0 1-6 8" />
      <path d="M24 25v6" />
      <path d="M17 40c0-3 3-4 7-4s7 1 7 4" />
      <path d="M16 40h16" />
    </svg>
  )
}

export default function Home() {
  // El ranking se habilita cuando ya hay resultados cargados (semifinalistas
  // o campeón). Antes de eso todos tienen 0 puntos y no tiene sentido mostrarlo.
  const [rankingReady, setRankingReady] = useState(false)

  useEffect(() => {
    supabase
      .from('results')
      .select('semifinalists, champion_id')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data?.semifinalists?.length > 0 || data?.champion_id != null) {
          setRankingReady(true)
        }
      })
  }, [])

  return (
    <main className="relative flex h-[100svh] flex-col items-center justify-center overflow-hidden bg-ink px-4 py-8 text-center text-white">
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* foco de estadio desde arriba */}
        <div className="absolute left-1/2 top-0 h-[70vh] w-[120vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(241,237,225,0.12),transparent_60%)]" />
        {/* viñeta inferior */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,transparent_55%,rgba(20,20,20,0.9))]" />

        {/* líneas de cancha */}
        <svg
          className="absolute left-1/2 top-1/2 h-[125vmin] w-[125vmin] -translate-x-1/2 -translate-y-1/2 text-cream/[0.045]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          aria-hidden="true"
        >
          <line x1="0" y1="100" x2="200" y2="100" />
          <circle cx="100" cy="100" r="34" />
          <circle cx="100" cy="100" r="2.5" fill="currentColor" stroke="none" />
        </svg>

        {/* pelotas */}
        <Ball className="animate-float-ball absolute -left-6 top-10 text-7xl opacity-15 blur-[0.5px]" />
        <Ball className="animate-float-ball-slow absolute -right-8 bottom-10 text-[7rem] opacity-10 blur-[0.5px]" />
        <Ball className="animate-float-ball absolute right-10 top-16 text-3xl opacity-30" />
      </div>

      <div className="animate-rise relative mx-auto w-full max-w-md">
        {/* trofeo con anillo giratorio */}
        <div className="relative mx-auto mb-7 grid h-24 w-24 place-items-center">
          <div className="animate-pulse-glow absolute inset-2 rounded-full bg-cream/10 blur-xl" />
          <div className="relative grid h-16 w-16 place-items-center rounded-full border border-cream/20 bg-white/5">
            <Trophy className="h-8 w-8 text-cream" />
          </div>
        </div>

        <h1 className="text-[2.75rem] font-bold uppercase leading-[1.05]">
          <span className="text-cream/90">mazzprode</span>
          <br />
          <span className="text-shine">Mundial 2026</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xs text-sm font-light text-white/70">
          Elige tus semifinalistas, el subcampeón y el campeón. Suma puntos y
          compite en el ranking.
        </p>

        <div className="mt-9 space-y-3">
          <Link
            to="/jugar"
            className="group block w-full rounded-xl bg-cream py-3.5 text-sm font-semibold uppercase tracking-wide text-ink shadow-lg shadow-cream/10 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-cream/20 active:translate-y-0"
          >
            Jugar
            <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
          {rankingReady ? (
            <Link
              to="/ranking"
              className="block w-full rounded-xl border border-cream/30 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-cream hover:bg-white/5 active:scale-[0.99]"
            >
              Ver ranking
            </Link>
          ) : (
            <div
              aria-disabled="true"
              className="block w-full cursor-not-allowed rounded-xl border border-cream/10 py-3.5 text-sm font-semibold uppercase tracking-wide text-white/30"
            >
              Ver ranking
              <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-white/25">
                Disponible cuando arranque la fase final
              </span>
            </div>
          )}
        </div>

        {/* meta */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.25em] text-cream/40">
          <span>Predice</span>
          <span className="text-cream/25">●</span>
          <span>Suma</span>
          <span className="text-cream/25">●</span>
          <span>Gana</span>
        </div>
      </div>
    </main>
  )
}

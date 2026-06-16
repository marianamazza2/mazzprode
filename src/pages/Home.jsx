import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main className="flex h-[100svh] flex-col items-center justify-center overflow-hidden bg-ink px-4 py-8 text-center text-white">
      <div className="mx-auto w-full max-w-md">
        <p className="text-[11px] uppercase tracking-[0.3em] text-cream/70">
          MazzMKT
        </p>
        <h1 className="mt-3 text-5xl font-bold leading-tight text-cream">
          Prode
          <br />
          Mundial 2026
        </h1>
        <p className="mt-4 text-base text-white/70">
          Elige tus semifinalistas, el subcampeón y el campeón. Suma puntos y
          compite en el ranking.
        </p>

        <div className="mt-10 space-y-3">
          <Link
            to="/jugar"
            className="block w-full rounded-xl bg-cream py-3.5 text-base font-bold text-ink transition hover:bg-white active:scale-[0.99]"
          >
            Jugar
          </Link>
          <Link
            to="/ranking"
            className="block w-full rounded-xl border border-cream/30 py-3.5 text-base font-bold text-white transition hover:border-cream active:scale-[0.99]"
          >
            Ver ranking
          </Link>
        </div>
      </div>
    </main>
  )
}

import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }

function Pick({ team, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className="text-4xl leading-none">{team.flag_emoji}</span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#f3ecdc]/60">
        {label}
      </span>
      <span className="text-xs text-[#f3ecdc]" style={serif}>
        {team.name}
      </span>
    </div>
  )
}

export default function PredictionCard({
  champion,
  runnerUp,
  semi3,
  semi4,
  instagram,
  name,
}) {
  const cardRef = useRef(null)
  const [sharing, setSharing] = useState(false)

  if (!champion || !runnerUp || !semi3 || !semi4) return null

  const ig = instagram?.trim()
  const handle = ig ? (ig.startsWith('@') ? ig : `@${ig}`) : name?.trim()

  function download(dataUrl) {
    const link = document.createElement('a')
    link.download = 'mi-prode-mundial-2026.png'
    link.href = dataUrl
    link.click()
  }

  async function handleShare() {
    setSharing(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'mi-prode-mundial-2026.png', {
        type: 'image/png',
      })

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'MazzProde — Mundial 2026',
            text: 'Mi pronóstico para el Mundial 2026 ⚽',
          })
        } catch (err) {
          if (err.name !== 'AbortError') download(dataUrl)
        }
      } else {
        download(dataUrl)
      }
    } catch {
      // Si la exportación falla no hay nada que compartir; el botón queda disponible para reintentar
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="mx-auto flex aspect-[4/5] w-full max-w-[340px] flex-col bg-[#0c0b09] px-7 py-7 text-[#f3ecdc]"
      >
        {/* Cabecera */}
        <div className="flex items-baseline justify-between border-b border-[#f3ecdc]/25 pb-3">
          <span className="text-sm font-bold uppercase tracking-[0.3em]" style={serif}>
            MazzProde
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#f3ecdc]/60">
            Mundial 2026
          </span>
        </div>

        {/* Campeón */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#f3ecdc]/60">
            Mi pronóstico
          </span>
          <span className="mt-4 text-7xl leading-none">{champion.flag_emoji}</span>
          <span
            className="mt-4 text-[13px] uppercase tracking-[0.25em] text-[#f3ecdc]/70"
            style={serif}
          >
            Campeón
          </span>
          <span className="mt-1 text-3xl italic leading-tight" style={serif}>
            {champion.name}
          </span>
        </div>

        {/* Subcampeón y semifinalistas */}
        <div className="grid grid-cols-3 gap-2 border-t border-[#f3ecdc]/25 pt-4">
          <Pick team={runnerUp} label="Subcampeón" />
          <Pick team={semi3} label="Semifinalista" />
          <Pick team={semi4} label="Semifinalista" />
        </div>

        {/* Pie */}
        <div className="mt-5 flex items-center justify-between border-t border-[#f3ecdc]/25 pt-3">
          <span className="text-xs text-[#f3ecdc]/80" style={serif}>
            {handle}
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#f3ecdc]/50">
            mazzprode
          </span>
        </div>
      </div>

      <p className="text-center text-sm font-semibold text-slate-700">
        📲 Compartí en tu story y etiquetá a 2 amigos
      </p>

      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="w-full rounded-xl bg-slate-900 py-3.5 text-base font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60"
      >
        {sharing ? 'Preparando imagen…' : 'Compartir'}
      </button>
    </div>
  )
}

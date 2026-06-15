import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { dmSansFontFace } from '../lib/dmSansFont'

// La card se renderiza a 360x640 (relación 9:16) y se exporta con pixelRatio 3
// → 1080x1920, formato story de Instagram.
const CARD_W = 360
const CARD_H = 640

function Pick({ team, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className="text-4xl leading-none">{team.flag_emoji}</span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-cream/70">
        {label}
      </span>
      <span className="text-xs font-medium text-white">{team.name}</span>
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
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 3,
        cacheBust: true,
        // Le pasamos la fuente ya embebida en base64 para que la exportación
        // sea consistente sin depender de la red.
        fontEmbedCSS: dmSansFontFace,
      })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'mi-prode-mundial-2026.png', {
        type: 'image/png',
      })

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'MazzMKT — Mundial 2026',
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
        style={{
          width: CARD_W,
          height: CARD_H,
          fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
        }}
        className="mx-auto flex flex-col bg-ink px-8 py-9 text-white"
      >
        {/* Fuente embebida: viaja dentro del nodo que html-to-image clona */}
        <style dangerouslySetInnerHTML={{ __html: dmSansFontFace }} />

        {/* Cabecera */}
        <div className="flex items-baseline justify-between border-b border-cream/20 pb-4">
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-cream">
            MazzMKT
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
            Mundial 2026
          </span>
        </div>

        {/* Campeón */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="text-[11px] uppercase tracking-[0.3em] text-cream/70">
            Mi pronóstico
          </span>
          <span className="mt-6 text-8xl leading-none">
            {champion.flag_emoji}
          </span>
          <span className="mt-6 text-[13px] uppercase tracking-[0.25em] text-cream/80">
            Campeón
          </span>
          <span className="mt-1 text-4xl font-bold leading-tight">
            {champion.name}
          </span>
        </div>

        {/* Subcampeón y semifinalistas */}
        <div className="grid grid-cols-3 gap-2 border-t border-cream/20 pt-5">
          <Pick team={runnerUp} label="Subcampeón" />
          <Pick team={semi3} label="Semifinalista" />
          <Pick team={semi4} label="Semifinalista" />
        </div>

        {/* Handle */}
        <div className="mt-6 flex items-center justify-between border-t border-cream/20 pt-4">
          <span className="text-sm font-medium text-white/80">{handle}</span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-cream/60">
            mazzmkt
          </span>
        </div>

        {/* Mini-CTA al pie */}
        <p className="mt-4 rounded-lg bg-cream py-2.5 text-center text-sm font-bold text-ink">
          Jugá vos 👉 comentá MUNDIAL
        </p>
      </div>

      <p className="text-center text-sm font-semibold text-white/80">
        📲 Compartí en tu story y etiquetá a 2 amigos
      </p>

      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="w-full rounded-xl bg-cream py-3.5 text-base font-bold text-ink transition hover:bg-white active:scale-[0.99] disabled:opacity-60"
      >
        {sharing ? 'Preparando imagen…' : 'Compartir'}
      </button>
    </div>
  )
}

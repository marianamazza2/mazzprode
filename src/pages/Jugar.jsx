import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import LeadForm from '../components/LeadForm.jsx'
import PredictionForm from '../components/PredictionForm.jsx'
import PredictionCard from '../components/PredictionCard.jsx'

// Los pronósticos cierran al final del 28/06/2026 (hora argentina)
const DEADLINE = new Date('2026-06-28T23:59:59-03:00')

// Texto de la fecha límite que se muestra al usuario (editable)
const DEADLINE_LABEL = '28 de junio'

// Premios del podio (editables)
const PRIZES = [
  { medal: '🥇', place: '1°', prize: 'Landing page profesional' },
  { medal: '🥈', place: '2°', prize: 'Auditoría SEO de tu web' },
  { medal: '🥉', place: '3°', prize: 'Ebook "Lanzá tu marca desde cero"' },
]

const emptyLead = {
  name: '',
  instagram: '',
  email: '',
  has_business: false,
  business_name: '',
  consent: false,
}

const emptyPrediction = {
  champion_id: '',
  runner_up_id: '',
  semifinal_3_id: '',
  semifinal_4_id: '',
  final_goals: '',
}

export default function Jugar() {
  const closed = new Date() > DEADLINE

  const [teams, setTeams] = useState([])
  const [lead, setLead] = useState(emptyLead)
  const [prediction, setPrediction] = useState(emptyPrediction)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('teams')
      .select('id, name, code, flag_emoji, group_name')
      .order('group_name')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError('No pudimos cargar las selecciones. Recarga la página.')
        else setTeams(data)
      })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const picks = [
      prediction.champion_id,
      prediction.runner_up_id,
      prediction.semifinal_3_id,
      prediction.semifinal_4_id,
    ]
    if (new Set(picks).size < 4) {
      setError('Las cuatro selecciones tienen que ser distintas.')
      return
    }

    setSaving(true)

    // Un solo insert transaccional: si falla cualquiera de los dos, no queda nada
    const { error: submitError } = await supabase.rpc('submit_entry', {
      p_name: lead.name.trim(),
      p_instagram: lead.instagram.trim() || null,
      p_email: lead.email.trim().toLowerCase(),
      p_has_business: lead.has_business,
      p_business_name: lead.has_business ? lead.business_name.trim() : null,
      p_consent: lead.consent,
      p_champion_id: Number(prediction.champion_id),
      p_runner_up_id: Number(prediction.runner_up_id),
      p_semifinal_3_id: Number(prediction.semifinal_3_id),
      p_semifinal_4_id: Number(prediction.semifinal_4_id),
      p_final_goals: Number(prediction.final_goals),
    })

    if (submitError) {
      setSaving(false)
      setError(
        submitError.code === '23505'
          ? 'Ya existe un pronóstico con ese email.'
          : 'Hubo un error al guardar tu pronóstico. Prueba de nuevo.',
      )
      return
    }

    setSaving(false)
    setSuccess(true)
  }

  if (success) {
    const teamById = (id) => teams.find((t) => t.id === Number(id))
    return (
      <main className="min-h-screen bg-ink px-4 py-10 text-white">
        <div className="mx-auto max-w-md space-y-6">
          <div className="text-center">
            <p className="text-5xl">🎉</p>
            <h1 className="mt-3 text-2xl font-bold text-cream">
              ¡Pronóstico guardado!
            </h1>
            <p className="mt-2 text-white/70">
              Gracias por jugar, {lead.name.trim()}. Después de la final podrás
              ver tu puesto en el ranking.
            </p>
          </div>

          <PredictionCard
            champion={teamById(prediction.champion_id)}
            runnerUp={teamById(prediction.runner_up_id)}
            semi3={teamById(prediction.semifinal_3_id)}
            semi4={teamById(prediction.semifinal_4_id)}
            instagram={lead.instagram}
            name={lead.name}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-white">
      <div className="mx-auto max-w-md">
        <p className="text-center text-[11px] uppercase tracking-[0.3em] text-cream/70">
          MazzMKT · Mundial 2026
        </p>
        <h1 className="mt-2 text-center text-3xl font-bold text-cream">
          Prode Mundial 2026
        </h1>
        <p className="mt-1 text-center text-sm text-white/70">
          Elige tus semifinalistas, el campeón y los goles de la final.
        </p>

        {closed && (
          <div className="mt-5 rounded-xl border border-cream/30 bg-cream/10 p-4 text-center font-semibold text-cream">
            🔒 Pronósticos cerrados
          </div>
        )}

        <details
          open
          className="group mt-5 rounded-2xl border border-cream/15 bg-white/5 p-5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold text-cream [&::-webkit-details-marker]:hidden">
            ¿Cómo participo?
            <span className="text-base text-cream/60 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-white/80">
            {/* Pasos para participar */}
            <ol className="space-y-4">
              {[
                <>
                  Comenta <strong>MUNDIAL</strong> en el post, dale like y sigue
                  la cuenta <strong>@mazzmkt</strong> en Instagram.
                </>,
                'Elige tus 4 selecciones: quién saldrá campeón, quién subcampeón, y las otras 2 que llegarán a las semifinales.',
                'Añade cuántos goles crees que habrá en la final (esto servirá en caso de empate para los posibles ganadores del prode).',
                <>
                  Envía tu pronóstico antes del <strong>{DEADLINE_LABEL}</strong>.
                  ¡Listo, ya estás participando!
                </>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-xs font-bold text-ink">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {/* Puntos */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cream/70">
                Suma puntos así
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-baseline justify-between gap-3 border-b border-cream/10 pb-1.5">
                  <span>Si aciertas el campeón</span>
                  <span className="shrink-0 font-bold text-cream">+50</span>
                </li>
                <li className="flex items-baseline justify-between gap-3 border-b border-cream/10 pb-1.5">
                  <span>Si aciertas el subcampeón</span>
                  <span className="shrink-0 font-bold text-cream">+25</span>
                </li>
                <li className="flex items-baseline justify-between gap-3 border-b border-cream/10 pb-1.5">
                  <span>Cada semifinalista acertado <span className="text-white/50">(los 4 cuentan)</span></span>
                  <span className="shrink-0 font-bold text-cream">+10</span>
                </li>
                <li className="flex items-baseline justify-between gap-3 border-b border-cream/10 pb-1.5">
                  <span>Goles en la final</span>
                  <span className="shrink-0 text-white/50">solo desempatan</span>
                </li>
                <li className="flex items-baseline justify-between gap-3 pt-0.5">
                  <span className="font-semibold text-cream">Máximo</span>
                  <span className="shrink-0 font-bold text-cream">115 puntos</span>
                </li>
              </ul>
            </div>

            {/* Premios */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cream/70">
                Premios
              </p>
              <ul className="space-y-1.5">
                {PRIZES.map((p) => (
                  <li key={p.place} className="flex items-center gap-3">
                    <span className="shrink-0 text-lg">{p.medal}</span>
                    <span>
                      <span className="font-semibold text-cream">{p.place}:</span>{' '}
                      {p.prize}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-8 rounded-2xl border border-cream/15 bg-white/5 p-5"
        >
          <LeadForm value={lead} onChange={setLead} disabled={closed} />
          <PredictionForm
            value={prediction}
            onChange={setPrediction}
            teams={teams}
            disabled={closed}
          />

          <fieldset disabled={closed} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
            <input
              id="lead-consent"
              type="checkbox"
              required
              className="mt-0.5 h-5 w-5 shrink-0 rounded accent-cream"
              checked={lead.consent}
              onChange={(e) => setLead({ ...lead, consent: e.target.checked })}
            />
            <label htmlFor="lead-consent" className="text-xs leading-relaxed text-white/60">
              Acepto que mis datos se usen para gestionar este juego y recibir
              comunicaciones relacionadas, conforme al RGPD. Puedo pedir su
              eliminación en cualquier momento. *
            </label>
          </fieldset>

          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-medium text-red-300">
              {error}
            </p>
          )}

          {!closed && (
            <button
              type="submit"
              disabled={saving || teams.length === 0}
              className="w-full rounded-xl bg-cream py-3.5 text-base font-bold text-ink transition hover:bg-white active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Enviar pronóstico'}
            </button>
          )}
        </form>
      </div>
    </main>
  )
}

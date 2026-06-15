import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import LeadForm from '../components/LeadForm.jsx'
import PredictionForm from '../components/PredictionForm.jsx'
import PredictionCard from '../components/PredictionCard.jsx'

// Los pronósticos cierran al final del 28/06/2026 (hora argentina)
const DEADLINE = new Date('2026-06-28T23:59:59-03:00')

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
        if (err) setError('No pudimos cargar las selecciones. Recargá la página.')
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
          : 'Hubo un error al guardar tu pronóstico. Probá de nuevo.',
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
              Gracias por jugar, {lead.name.trim()}. Después de la final vas a
              poder ver tu puesto en el ranking.
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
          Elegí tus semifinalistas, el campeón y los goles de la final.
        </p>

        {closed && (
          <div className="mt-5 rounded-xl border border-cream/30 bg-cream/10 p-4 text-center font-semibold text-cream">
            🔒 Pronósticos cerrados
          </div>
        )}

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

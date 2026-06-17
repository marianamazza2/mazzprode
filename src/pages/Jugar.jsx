import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import Dropdown from '../components/Dropdown.jsx'
import LeadForm from '../components/LeadForm.jsx'
import PredictionCard from '../components/PredictionCard.jsx'

// Los pronósticos cierran al final del 28/06/2026 (hora argentina)
const DEADLINE = new Date('2026-06-28T23:59:59-03:00')

const TOTAL_STEPS = 6

// Tope de goles en la final (el récord histórico mundialista es 7).
const MAX_GOALS = 20

// Email válido: algo @ algo . algo (sin espacios).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Campos de selección de países, en el orden en que se preguntan.
const PICK_FIELDS = ['champion_id', 'runner_up_id', 'semifinal_3_id', 'semifinal_4_id']

// Una pregunta por pantalla (pasos 1 a 4).
const QUESTIONS = [
  { field: 'champion_id', emoji: '🏆', title: '¿Quién sale campeón?' },
  { field: 'runner_up_id', emoji: '🥈', title: '¿Quién sale subcampeón?' },
  {
    field: 'semifinal_3_id',
    emoji: '🎯',
    title: 'Semifinalista',
    sub: '1 de 2',
    hint: 'Llega a semis, sin contar al campeón ni al subcampeón',
  },
  {
    field: 'semifinal_4_id',
    emoji: '🎯',
    title: 'Semifinalista',
    sub: '2 de 2',
    hint: 'Llega a semis, sin contar al campeón ni al subcampeón',
  },
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

const primaryBtn =
  'rounded-xl bg-cream py-3.5 text-base font-bold text-ink transition hover:bg-white active:scale-[0.99] disabled:opacity-60'
const inputClass =
  'w-full rounded-xl border border-cream/30 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-xs placeholder:text-white/40 transition-colors hover:border-cream/60 focus:border-cream focus:outline-none focus:ring-2 focus:ring-cream/20 disabled:opacity-50'

function Progress({ step }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? 'bg-cream' : 'bg-white/15'
            }`}
          />
        ))}
      </div>
      <p className="mt-3.5 text-center text-[11px] uppercase tracking-[0.25em] text-cream/60">
        Paso {step} de {TOTAL_STEPS}
      </p>
    </div>
  )
}

export default function Jugar() {
  const closed = new Date() > DEADLINE

  const [teams, setTeams] = useState([])
  const [step, setStep] = useState(1)
  // Dirección de la última navegación, para animar la entrada del paso.
  const [dir, setDir] = useState('fwd')
  const [lead, setLead] = useState(emptyLead)
  const [prediction, setPrediction] = useState(emptyPrediction)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [consentError, setConsentError] = useState('')

  // Auto-avance diferido: lo dispara solo una selección nueva (no el montaje),
  // así volver "Atrás" no reenvía hacia adelante.
  const advanceTimer = useRef(null)

  useEffect(() => {
    supabase
      .from('teams')
      .select('id, name, flag_emoji')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError('No pudimos cargar las selecciones. Recarga la página.')
        else setTeams(data)
      })
  }, [])

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  // Al llegar a la pantalla de éxito subimos al inicio: si el paso anterior
  // venía scrolleado, la card quedaría cortada.
  useEffect(() => {
    if (success) window.scrollTo(0, 0)
  }, [success])

  function clearAdvance() {
    clearTimeout(advanceTimer.current)
    advanceTimer.current = null
  }

  function goNext() {
    clearAdvance()
    setError('')
    setDir('fwd')
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function goBack() {
    clearAdvance()
    setError('')
    setDir('back')
    setStep((s) => Math.max(s - 1, 1))
  }

  // Selección de país: guarda el valor y avanza solo, tras un breve instante
  // para que se vea la selección. Sin botón intermedio.
  function pickTeam(field, v) {
    setPrediction((p) => ({ ...p, [field]: v }))
    clearAdvance()
    const from = step
    advanceTimer.current = setTimeout(() => {
      setDir('fwd')
      setStep((s) => (s === from ? Math.min(s + 1, TOTAL_STEPS) : s))
    }, 320)
  }

  // Países disponibles para un campo: alfabéticos y sin los ya elegidos en
  // otros campos (el propio valor sigue visible para poder corregirlo).
  function availableTeams(field) {
    const taken = PICK_FIELDS.filter((f) => f !== field)
      .map((f) => prediction[f])
      .filter(Boolean)
    return teams.filter((t) => !taken.includes(String(t.id)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const picks = PICK_FIELDS.map((f) => prediction[f])
    if (picks.some((p) => !p)) {
      setError('Faltan selecciones. Vuelve atrás y complétalas.')
      return
    }
    if (new Set(picks).size < 4) {
      setError('Las cuatro selecciones tienen que ser distintas.')
      return
    }

    const email = lead.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      setEmailError('Debes ingresar un email válido.')
      return
    }
    setEmailError('')

    if (!lead.consent) {
      setConsentError('Debes aceptar el tratamiento de datos para participar.')
      return
    }
    setConsentError('')

    setSaving(true)

    // Un solo insert transaccional: si falla cualquiera de los dos, no queda nada
    const { error: submitError } = await supabase.rpc('submit_entry', {
      p_name: lead.name.trim(),
      p_instagram: lead.instagram.trim() || null,
      p_email: email,
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

  const goalsOver =
    prediction.final_goals !== '' && Number(prediction.final_goals) > MAX_GOALS

  if (success) {
    const teamById = (id) => teams.find((t) => t.id === Number(id))
    return (
      <main className="min-h-screen bg-ink px-4 py-6 text-white">
        <div className="mx-auto max-w-md space-y-4">
          <div className="text-center">
            <p className="text-4xl">🎉</p>
            <h1 className="mt-2 text-xl font-bold text-cream">
              ¡Pronóstico guardado!
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Gracias por jugar, {lead.name.trim()}. Cuando termine la final
              cargaremos los resultados y sabrás cuántos puntos sumaste.
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

  // Modo solo-lectura: ya pasó la fecha límite.
  if (closed) {
    return (
      <main className="flex min-h-screen items-center bg-ink px-4 py-10 text-white">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cream/70">
            MazzMKT · Mundial 2026
          </p>
          <p className="mt-6 text-5xl">🔒</p>
          <h1 className="mt-4 text-2xl font-bold text-cream">
            Pronósticos cerrados
          </h1>
          <p className="mt-2 text-white/70">
            El plazo para participar terminó. Cuando se juegue la final,
            publicaremos el ranking con los ganadores.
          </p>
          <a
            href="/ranking"
            className={`mt-8 inline-block w-full ${primaryBtn} text-center`}
          >
            Ver el ranking
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col">
        <div className="relative flex items-center justify-center">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
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
            </button>
          )}
          <p className="text-center text-[11px] uppercase tracking-[0.3em] text-cream/70">
            MazzMKT · Mundial 2026
          </p>
        </div>

        <div className="mt-6">
          <Progress step={step} />
        </div>

        {/* Errores ajenos al envío (p. ej. fallo al cargar selecciones) */}
        {error && step !== 6 && (
          <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-medium text-red-300">
            {error}
          </p>
        )}

        <div
          key={step}
          className={`flex flex-1 flex-col ${dir === 'back' ? 'step-in-back' : 'step-in-fwd'}`}
        >
        {/* Pasos 1-4: una selección de país por pantalla */}
        {step <= 4 &&
          (() => {
            const q = QUESTIONS[step - 1]
            const value = prediction[q.field]
            const options = availableTeams(q.field).map((t) => ({
              value: t.id,
              emoji: t.flag_emoji,
              label: t.name,
            }))

            return (
              <div className="flex flex-1 flex-col">
                <div className="mb-6 text-center">
                  <span className="text-4xl">{q.emoji}</span>
                  <h1 className="mt-3 text-2xl font-bold text-cream">{q.title}</h1>
                  {q.sub && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-cream/50">
                      {q.sub}
                    </p>
                  )}
                  {q.hint && <p className="mt-2 text-sm text-white/60">{q.hint}</p>}
                </div>

                {teams.length === 0 ? (
                  <p className="text-center text-sm text-white/50">
                    Cargando selecciones…
                  </p>
                ) : (
                  <Dropdown
                    id={`pick-${q.field}`}
                    value={value}
                    onChange={(v) => pickTeam(q.field, v)}
                    placeholder="Elige una selección…"
                    groups={[{ label: null, options }]}
                  />
                )}
              </div>
            )
          })()}

        {/* Paso 5: goles de la final (sin auto-avance) */}
        {step === 5 && (
          <div className="flex flex-1 flex-col">
            <div className="mb-6 text-center">
              <span className="text-4xl">⚽</span>
              <h1 className="mt-3 text-2xl font-bold text-cream">
                ¿Goles en la final?
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Total entre los dos equipos. Solo se usa para desempatar si
                acabas con los mismos puntos que otra persona que juega.
              </p>
            </div>

            <input
              id="pred-final-goals"
              type="number"
              min="0"
              max={MAX_GOALS}
              inputMode="numeric"
              placeholder="Ej: 3"
              className={inputClass}
              value={prediction.final_goals}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                setPrediction((p) => ({ ...p, final_goals: digits }))
              }}
            />

            {goalsOver && (
              <p className="mt-2 text-xs font-medium text-red-300">
                El máximo permitido es {MAX_GOALS} goles.
              </p>
            )}

            <button
              type="button"
              onClick={goNext}
              disabled={prediction.final_goals === '' || goalsOver}
              className={`mt-8 w-full ${primaryBtn}`}
            >
              Siguiente
            </button>
          </div>
        )}

        {/* Paso 6: datos y envío (sin auto-avance) */}
        {step === 6 && (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="mb-6 text-center">
              <span className="text-4xl">📝</span>
              <h1 className="mt-3 text-2xl font-bold text-cream">Tus datos</h1>
            </div>

            <LeadForm
              value={lead}
              onChange={(v) => {
                setLead(v)
                if (emailError) setEmailError('')
              }}
              emailError={emailError}
            />

            <div className="mt-6">
              <fieldset className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                <input
                  id="lead-consent"
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 rounded accent-cream"
                  checked={lead.consent}
                  onChange={(e) => {
                    setLead({ ...lead, consent: e.target.checked })
                    if (consentError) setConsentError('')
                  }}
                />
                <label htmlFor="lead-consent" className="text-xs leading-relaxed text-white/60">
                  Acepto que mis datos se usen para gestionar este juego y recibir
                  comunicaciones relacionadas, conforme al RGPD. Puedo pedir su
                  eliminación en cualquier momento. *
                </label>
              </fieldset>
              {consentError && (
                <p className="mt-2 text-xs font-medium text-red-300">{consentError}</p>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-medium text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || teams.length === 0}
              className={`mt-8 w-full ${primaryBtn}`}
            >
              {saving ? 'Enviando…' : 'Enviar pronóstico'}
            </button>
          </form>
        )}
        </div>
      </div>
    </main>
  )
}

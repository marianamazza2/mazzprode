import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }

const inputClass =
  'w-full rounded-xl border border-[#f3ecdc]/30 bg-transparent px-3 py-2.5 text-base text-[#f3ecdc] placeholder:text-[#f3ecdc]/40 focus:border-[#f3ecdc] focus:outline-none [&>option]:bg-[#0c0b09]'

const buttonClass =
  'w-full rounded-xl bg-[#f3ecdc] py-3 text-base font-bold text-[#0c0b09] transition hover:bg-white active:scale-[0.99] disabled:opacity-60'

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-[#0c0b09] px-4 py-10 text-[#f3ecdc]">
      <div className="mx-auto max-w-md">
        <header className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#f3ecdc]/60">
            MazzProde · Mundial 2026
          </p>
          <h1 className="mt-2 text-4xl italic" style={serif}>
            Admin
          </h1>
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  )
}

function TeamSelect({ id, label, value, onChange, teams }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-[#f3ecdc]/70">
        {label}
      </label>
      <select
        id={id}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.flag_emoji} {team.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })
    setSending(false)
    if (err) setError('No pudimos enviar el link. Probá de nuevo.')
    else setSent(true)
  }

  if (sent) {
    return (
      <p className="text-center text-sm text-[#f3ecdc]/70">
        📬 Te enviamos un link de acceso a <strong>{email}</strong>. Abrilo
        desde este dispositivo.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="admin-email" className="mb-1 block text-sm text-[#f3ecdc]/70">
          Email de administración
        </label>
        <input
          id="admin-email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@email.com"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={sending} className={buttonClass}>
        {sending ? 'Enviando…' : 'Enviarme link de acceso'}
      </button>
    </form>
  )
}

function Panel() {
  const [teams, setTeams] = useState([])
  const [form, setForm] = useState({
    semi1: '',
    semi2: '',
    semi3: '',
    semi4: '',
    runner_up_id: '',
    champion_id: '',
    final_goals: '',
    locked: false,
  })
  const [saving, setSaving] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const set = (field, v) => setForm((f) => ({ ...f, [field]: v }))

  useEffect(() => {
    async function load() {
      const [teamsRes, resultsRes] = await Promise.all([
        supabase
          .from('teams')
          .select('id, name, flag_emoji')
          .order('name'),
        supabase.from('results').select('*').eq('id', 1).single(),
      ])
      if (teamsRes.error || resultsRes.error) {
        setError('No pudimos cargar los datos. Recargá la página.')
        return
      }
      setTeams(teamsRes.data)
      const r = resultsRes.data
      const semis = r.semifinalists ?? []
      setForm({
        semi1: semis[0] ?? '',
        semi2: semis[1] ?? '',
        semi3: semis[2] ?? '',
        semi4: semis[3] ?? '',
        runner_up_id: r.runner_up_id ?? '',
        champion_id: r.champion_id ?? '',
        final_goals: r.final_goals ?? '',
        locked: r.locked,
      })
    }
    load()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    const semis = [form.semi1, form.semi2, form.semi3, form.semi4]
      .filter((v) => v !== '')
      .map(Number)
    if (new Set(semis).size < semis.length) {
      setError('Los semifinalistas tienen que ser distintos.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase
      .from('results')
      .update({
        semifinalists: semis.length > 0 ? semis : null,
        runner_up_id: form.runner_up_id ? Number(form.runner_up_id) : null,
        champion_id: form.champion_id ? Number(form.champion_id) : null,
        final_goals: form.final_goals !== '' ? Number(form.final_goals) : null,
        locked: form.locked,
      })
      .eq('id', 1)
    setSaving(false)

    if (err) setError('No pudimos guardar el resultado. Probá de nuevo.')
    else setMessage('✅ Resultado guardado.')
  }

  async function handleRecalculate() {
    setMessage('')
    setError('')
    setRecalculating(true)

    const [resultsRes, predsRes] = await Promise.all([
      supabase.from('results').select('*').eq('id', 1).single(),
      supabase
        .from('predictions')
        .select('id, champion_id, runner_up_id, semifinal_3_id, semifinal_4_id'),
    ])

    if (resultsRes.error || predsRes.error) {
      setRecalculating(false)
      setError('No pudimos leer los datos para recalcular.')
      return
    }

    const real = resultsRes.data
    const semis = real.semifinalists ?? []

    const updates = predsRes.data.map((p) => {
      const picks = [
        p.champion_id,
        p.runner_up_id,
        p.semifinal_3_id,
        p.semifinal_4_id,
      ]
      let points = picks.filter((id) => semis.includes(id)).length * 10
      if (real.runner_up_id && p.runner_up_id === real.runner_up_id) points += 25
      if (real.champion_id && p.champion_id === real.champion_id) points += 50
      return { id: p.id, points }
    })

    const results = await Promise.all(
      updates.map((u) =>
        supabase.from('predictions').update({ points: u.points }).eq('id', u.id),
      ),
    )
    setRecalculating(false)

    const failed = results.filter((r) => r.error).length
    if (failed > 0) {
      setError(`Falló la actualización de ${failed} de ${updates.length} pronósticos.`)
    } else {
      setMessage(`✅ Puntos recalculados para ${updates.length} pronósticos.`)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-bold" style={serif}>
          Resultado real
        </h2>

        <TeamSelect id="res-semi1" label="Semifinalista 1" value={form.semi1} onChange={(v) => set('semi1', v)} teams={teams} />
        <TeamSelect id="res-semi2" label="Semifinalista 2" value={form.semi2} onChange={(v) => set('semi2', v)} teams={teams} />
        <TeamSelect id="res-semi3" label="Semifinalista 3" value={form.semi3} onChange={(v) => set('semi3', v)} teams={teams} />
        <TeamSelect id="res-semi4" label="Semifinalista 4" value={form.semi4} onChange={(v) => set('semi4', v)} teams={teams} />
        <TeamSelect id="res-runner-up" label="🥈 Subcampeón" value={form.runner_up_id} onChange={(v) => set('runner_up_id', v)} teams={teams} />
        <TeamSelect id="res-champion" label="🏆 Campeón" value={form.champion_id} onChange={(v) => set('champion_id', v)} teams={teams} />

        <div>
          <label htmlFor="res-final-goals" className="mb-1 block text-sm text-[#f3ecdc]/70">
            ⚽ Goles totales en la final
          </label>
          <input
            id="res-final-goals"
            type="number"
            min="0"
            max="30"
            inputMode="numeric"
            className={inputClass}
            value={form.final_goals}
            onChange={(e) => set('final_goals', e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="res-locked"
            type="checkbox"
            className="h-5 w-5 shrink-0 accent-[#f3ecdc]"
            checked={form.locked}
            onChange={(e) => set('locked', e.target.checked)}
          />
          <label htmlFor="res-locked" className="text-sm text-[#f3ecdc]/70">
            Resultado cerrado (locked)
          </label>
        </div>

        <button type="submit" disabled={saving || teams.length === 0} className={buttonClass}>
          {saving ? 'Guardando…' : 'Guardar resultado'}
        </button>
      </form>

      <div className="space-y-3 border-t border-[#f3ecdc]/25 pt-6">
        <h2 className="text-lg font-bold" style={serif}>
          Puntajes
        </h2>
        <p className="text-xs text-[#f3ecdc]/60">
          +10 por semifinalista acertado · +25 subcampeón exacto · +50 campeón
          exacto. Usa el último resultado guardado.
        </p>
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={recalculating}
          className={buttonClass}
        >
          {recalculating ? 'Recalculando…' : 'Recalcular puntos'}
        </button>
      </div>

      {message && <p className="text-center text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  )
}

export default function Admin() {
  const [session, setSession] = useState(undefined) // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (session === undefined) {
    return (
      <Shell>
        <p className="text-center text-sm text-[#f3ecdc]/50">Cargando…</p>
      </Shell>
    )
  }

  if (!session) {
    return (
      <Shell>
        <Login />
      </Shell>
    )
  }

  if (session.user.email !== ADMIN_EMAIL) {
    return (
      <Shell>
        <div className="space-y-4 text-center">
          <p className="text-sm text-[#f3ecdc]/70">
            🔒 Esta cuenta ({session.user.email}) no tiene acceso al panel.
          </p>
          <button type="button" onClick={handleSignOut} className={buttonClass}>
            Cerrar sesión
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <Panel />
      <button
        type="button"
        onClick={handleSignOut}
        className="mt-8 w-full text-center text-xs uppercase tracking-[0.2em] text-[#f3ecdc]/40 hover:text-[#f3ecdc]/70"
      >
        Cerrar sesión
      </button>
    </Shell>
  )
}

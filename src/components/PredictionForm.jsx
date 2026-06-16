import Dropdown from './Dropdown.jsx'

const inputClass =
  'w-full rounded-xl border border-cream/30 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-xs placeholder:text-white/40 transition-colors hover:border-cream/60 focus:border-cream focus:outline-none focus:ring-2 focus:ring-cream/20 disabled:opacity-50'

function TeamSelect({ id, label, hint, value, onChange, groups, takenIds }) {
  // Mapeamos los grupos al formato del Dropdown, marcando como deshabilitadas
  // las selecciones ya elegidas en otro campo.
  const dropdownGroups = groups.map(([groupName, groupTeams]) => ({
    label: `Grupo ${groupName}`,
    options: groupTeams.map((team) => ({
      value: team.id,
      emoji: team.flag_emoji,
      label: team.name,
      disabled:
        takenIds.includes(String(team.id)) && String(team.id) !== String(value),
    })),
  }))

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-white/70">
        {label} *
      </label>
      {hint && <p className="mb-2.5 mt-1 text-xs text-white/50">{hint}</p>}
      <Dropdown
        id={id}
        value={value}
        onChange={onChange}
        placeholder="Elige una selección…"
        groups={dropdownGroups}
      />
    </div>
  )
}

export default function PredictionForm({ value, onChange, teams, disabled }) {
  const set = (field, v) => onChange({ ...value, [field]: v })

  const groups = Object.entries(
    teams.reduce((acc, team) => {
      ;(acc[team.group_name] ??= []).push(team)
      return acc
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b))

  const takenIds = [
    value.champion_id,
    value.runner_up_id,
    value.semifinal_3_id,
    value.semifinal_4_id,
  ].filter(Boolean)

  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="mb-4 text-lg font-bold text-cream">
        Tu pronóstico
      </legend>

      <TeamSelect
        id="pred-champion"
        label="🏆 Campeón"
        hint="¿Quién levanta la copa?"
        value={value.champion_id}
        onChange={(v) => set('champion_id', v)}
        groups={groups}
        takenIds={takenIds}
      />
      <TeamSelect
        id="pred-runner-up"
        label="🥈 Subcampeón"
        hint="El que pierde la final"
        value={value.runner_up_id}
        onChange={(v) => set('runner_up_id', v)}
        groups={groups}
        takenIds={takenIds}
      />
      <TeamSelect
        id="pred-semifinal-3"
        label="Semifinalista 3"
        hint="Uno de los dos que llegan a semis (sin contar campeón ni subcampeón)"
        value={value.semifinal_3_id}
        onChange={(v) => set('semifinal_3_id', v)}
        groups={groups}
        takenIds={takenIds}
      />
      <TeamSelect
        id="pred-semifinal-4"
        label="Semifinalista 4"
        hint="Uno de los dos que llegan a semis (sin contar campeón ni subcampeón)"
        value={value.semifinal_4_id}
        onChange={(v) => set('semifinal_4_id', v)}
        groups={groups}
        takenIds={takenIds}
      />

      <div>
        <label htmlFor="pred-final-goals" className="block text-sm font-medium text-white/70">
          ⚽ Goles totales en la final *
        </label>
        <p className="mb-2.5 mt-1 text-xs text-white/50">
          Total de goles entre los dos equipos (solo para desempate)
        </p>
        <input
          id="pred-final-goals"
          type="number"
          required
          min="0"
          max="30"
          inputMode="numeric"
          placeholder="Ej: 3"
          className={inputClass}
          value={value.final_goals}
          onChange={(e) => set('final_goals', e.target.value)}
        />
      </div>
    </fieldset>
  )
}

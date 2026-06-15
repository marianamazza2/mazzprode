const selectClass =
  'w-full appearance-none rounded-xl border border-cream/30 bg-transparent px-3 py-2.5 text-base text-white focus:border-cream focus:outline-none disabled:opacity-50 [&_option]:bg-ink [&_option]:text-white [&_optgroup]:bg-ink [&_optgroup]:text-white'

function TeamSelect({ id, label, value, onChange, groups, takenIds }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-white/70">
        {label} *
      </label>
      <select
        id={id}
        required
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Elegí una selección…</option>
        {groups.map(([groupName, groupTeams]) => (
          <optgroup key={groupName} label={`Grupo ${groupName}`}>
            {groupTeams.map((team) => (
              <option
                key={team.id}
                value={team.id}
                disabled={takenIds.includes(String(team.id)) && String(team.id) !== value}
              >
                {team.flag_emoji} {team.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
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
      <legend className="mb-1 text-lg font-bold text-cream">
        Tu pronóstico
      </legend>

      <TeamSelect
        id="pred-champion"
        label="🏆 Campeón"
        value={value.champion_id}
        onChange={(v) => set('champion_id', v)}
        groups={groups}
        takenIds={takenIds}
      />
      <TeamSelect
        id="pred-runner-up"
        label="🥈 Subcampeón"
        value={value.runner_up_id}
        onChange={(v) => set('runner_up_id', v)}
        groups={groups}
        takenIds={takenIds}
      />
      <TeamSelect
        id="pred-semifinal-3"
        label="Semifinalista 3"
        value={value.semifinal_3_id}
        onChange={(v) => set('semifinal_3_id', v)}
        groups={groups}
        takenIds={takenIds}
      />
      <TeamSelect
        id="pred-semifinal-4"
        label="Semifinalista 4"
        value={value.semifinal_4_id}
        onChange={(v) => set('semifinal_4_id', v)}
        groups={groups}
        takenIds={takenIds}
      />

      <div>
        <label htmlFor="pred-final-goals" className="mb-1 block text-sm font-medium text-white/70">
          ⚽ Goles totales en la final *
        </label>
        <input
          id="pred-final-goals"
          type="number"
          required
          min="0"
          max="30"
          inputMode="numeric"
          placeholder="Ej: 3"
          className={selectClass}
          value={value.final_goals}
          onChange={(e) => set('final_goals', e.target.value)}
        />
      </div>
    </fieldset>
  )
}

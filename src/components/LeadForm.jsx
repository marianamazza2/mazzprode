const inputClass =
  'w-full rounded-xl border border-cream/30 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-xs placeholder:text-white/40 focus:border-cream focus:outline-none disabled:opacity-50'

export default function LeadForm({ value, onChange, disabled, emailError }) {
  const set = (field, v) => onChange({ ...value, [field]: v })

  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div>
        <label htmlFor="lead-name" className="mb-2 block text-sm font-medium text-white/70">
          Nombre *
        </label>
        <input
          id="lead-name"
          type="text"
          required
          autoComplete="name"
          placeholder="Tu nombre"
          className={inputClass}
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="lead-instagram" className="mb-2 block text-sm font-medium text-white/70">
          Instagram
        </label>
        <input
          id="lead-instagram"
          type="text"
          placeholder="@tuusuario"
          className={inputClass}
          value={value.instagram}
          onChange={(e) => set('instagram', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="lead-email" className="mb-2 block text-sm font-medium text-white/70">
          Email *
        </label>
        <input
          id="lead-email"
          type="text"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={inputClass}
          value={value.email}
          onChange={(e) => set('email', e.target.value)}
        />
        {emailError && (
          <p className="mt-2 text-xs font-medium text-red-300">{emailError}</p>
        )}
      </div>
    </fieldset>
  )
}

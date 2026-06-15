const inputClass =
  'w-full rounded-xl border border-cream/30 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-cream focus:outline-none disabled:opacity-50'

export default function LeadForm({ value, onChange, disabled }) {
  const set = (field, v) => onChange({ ...value, [field]: v })

  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="mb-1 text-lg font-bold text-cream">
        Tus datos
      </legend>

      <div>
        <label htmlFor="lead-name" className="mb-1 block text-sm font-medium text-white/70">
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
        <label htmlFor="lead-instagram" className="mb-1 block text-sm font-medium text-white/70">
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
        <label htmlFor="lead-email" className="mb-1 block text-sm font-medium text-white/70">
          Email *
        </label>
        <input
          id="lead-email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          className={inputClass}
          value={value.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="lead-has-business"
          type="checkbox"
          className="h-5 w-5 shrink-0 rounded accent-cream"
          checked={value.has_business}
          onChange={(e) => set('has_business', e.target.checked)}
        />
        <label htmlFor="lead-has-business" className="text-sm font-medium text-white/70">
          ¿Tenés un negocio?
        </label>
      </div>

      {value.has_business && (
        <div>
          <label htmlFor="lead-business-name" className="mb-1 block text-sm font-medium text-white/70">
            ¿Cuál? *
          </label>
          <input
            id="lead-business-name"
            type="text"
            required
            placeholder="Nombre de tu negocio"
            className={inputClass}
            value={value.business_name}
            onChange={(e) => set('business_name', e.target.value)}
          />
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
        <input
          id="lead-consent"
          type="checkbox"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded accent-cream"
          checked={value.consent}
          onChange={(e) => set('consent', e.target.checked)}
        />
        <label htmlFor="lead-consent" className="text-xs leading-relaxed text-white/60">
          Acepto que mis datos se usen para gestionar este juego y recibir
          comunicaciones relacionadas, conforme al RGPD. Puedo pedir su
          eliminación en cualquier momento. *
        </label>
      </div>
    </fieldset>
  )
}

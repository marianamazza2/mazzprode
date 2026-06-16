import { useEffect, useRef, useState } from 'react'

// Desplegable propio (no nativo) para tener un look de marca consistente en
// todos los dispositivos. Cierra al hacer click fuera o con Escape.
//
// groups: [{ label: string | null, options: [{ value, emoji, label, disabled }] }]
export default function Dropdown({ id, value, onChange, placeholder, groups, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = groups
    .flatMap((g) => g.options)
    .find((o) => String(o.value) === String(value))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-cream/30 bg-transparent px-3 py-2.5 text-left text-base text-white transition-colors hover:border-cream/60 focus:border-cream focus:outline-none focus:ring-2 focus:ring-cream/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? 'truncate' : 'truncate text-xs text-white/40'}>
          {selected ? `${selected.emoji} ${selected.label}` : placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-cream/60 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-cream/20 bg-ink py-1 shadow-xl shadow-black/50"
        >
          {groups.map((g, gi) => (
            <li key={g.label ?? gi}>
              {g.label && (
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.15em] text-cream/50">
                  {g.label}
                </p>
              )}
              {g.options.map((o) => {
                const isSelected = String(o.value) === String(value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={o.disabled}
                    onClick={() => {
                      onChange(String(o.value))
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-base transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      isSelected ? 'bg-cream/15 text-cream' : 'text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="text-lg leading-none">{o.emoji}</span>
                    <span className="truncate">{o.label}</span>
                    {isSelected && <span className="ml-auto text-cream">✓</span>}
                  </button>
                )
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

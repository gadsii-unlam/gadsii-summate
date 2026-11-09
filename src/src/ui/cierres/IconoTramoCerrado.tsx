/** Símbolo de la leyenda: tramo rojo punteado con el ícono de paso prohibido. */
import { ESTILO_TRAMO_CERRADO } from '../../cierres/index.ts'
import type { PropsIcono } from '../iconos/Iconos.tsx'

export default function IconoTramoCerrado({ titulo, tamano = 24, className }: PropsIcono) {
  const accesible = titulo
    ? { role: 'img' as const, 'aria-label': titulo }
    : { 'aria-hidden': true as const }
  return (
    <svg
      {...accesible}
      className={className}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      focusable="false"
    >
      <path
        d="M1 12h22"
        fill="none"
        stroke={ESTILO_TRAMO_CERRADO.color}
        strokeWidth="2.5"
        strokeDasharray="3.5 2.5"
      />
      <circle
        cx="12"
        cy="12"
        r="7"
        fill={ESTILO_TRAMO_CERRADO.color}
        stroke="#FFFFFF"
        strokeWidth="1"
      />
      <rect x="8" y="10.75" width="8" height="2.5" rx="0.6" fill="#FFFFFF" />
    </svg>
  )
}

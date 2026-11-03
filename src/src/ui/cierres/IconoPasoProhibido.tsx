/** Ícono de paso prohibido (círculo rojo con barra blanca) para usar fuera del mapa. */
import { ESTILO_TRAMO_CERRADO } from '../../cierres/index.ts'
import { DIAMETRO_ICONO } from './iconoHtml.ts'

export interface PropsIconoPasoProhibido {
  /** Nombre accesible. Sin título, el ícono es decorativo. */
  titulo?: string
  tamano?: number
}

export default function IconoPasoProhibido({
  titulo,
  tamano = DIAMETRO_ICONO,
}: PropsIconoPasoProhibido) {
  const accesible = titulo
    ? { role: 'img' as const, 'aria-label': titulo }
    : { 'aria-hidden': true as const }
  return (
    <svg {...accesible} focusable="false" width={tamano} height={tamano} viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="11"
        fill={ESTILO_TRAMO_CERRADO.color}
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <rect x="5.5" y="10" width="13" height="4" rx="1" fill="#FFFFFF" />
    </svg>
  )
}

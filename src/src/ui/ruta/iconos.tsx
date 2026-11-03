/** Íconos de la vista de ruta (estilo Material Symbols, decorativos). */
import type { Giro, TipoPaso } from '../../rutas/index.ts'

interface PropsIcono {
  tamano?: number
}

function Svg({ tamano = 24, d }: PropsIcono & { d: string }) {
  return (
    <svg
      aria-hidden="true"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      focusable="false"
      fill="currentColor"
    >
      <path d={d} />
    </svg>
  )
}

export function IconoParaguas(props: PropsIcono) {
  return (
    <Svg
      {...props}
      d="M12 2C6.48 2 2 6.03 2 11h9v7.5a1.5 1.5 0 0 1-3 0V18H6v.5a3.5 3.5 0 0 0 7 0V11h9c0-4.97-4.48-9-10-9z"
    />
  )
}

const D = {
  derecho: 'M11 20V7.83l-5.59 5.59L4 12l8-8 8 8-1.41 1.41L13 7.83V20z',
  izquierda:
    'M9 5 3 11l6 6 1.41-1.41L6.83 12H15a3 3 0 0 1 3 3v5h2v-5a5 5 0 0 0-5-5H6.83l3.58-3.59z',
  derecha: 'M15 5l6 6-6 6-1.41-1.41L17.17 12H9a3 3 0 0 0-3 3v5H4v-5a5 5 0 0 1 5-5h8.17l-3.58-3.59z',
  vuelta:
    'M9 4v2h5a4 4 0 0 1 0 8H7.83l2.58-2.59L9 10l-5 5 5 5 1.41-1.41L7.83 16H14a6 6 0 0 0 0-12z',
  llegar:
    'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
  piso: 'M4 20h4v-4h4v-4h4V8h4V4h-6v4h-4v4H6v4H4z',
  puerta: 'M14 6V4H5v16h9v-2H7V6zm1 3.5 1.41-1.41L20.33 12l-3.92 3.91L15 14.5l1.5-1.5H10v-2h6.5z',
} as const

/** Ícono del paso según su tipo y su giro. */
export function IconoPaso({ tipo, giro, tamano }: { tipo: TipoPaso; giro?: Giro } & PropsIcono) {
  if (tipo === 'llegar') return <Svg tamano={tamano} d={D.llegar} />
  if (tipo === 'piso' || tipo === 'escalera') return <Svg tamano={tamano} d={D.piso} />
  if (tipo === 'salir-edificio' || tipo === 'entrar-edificio')
    return <Svg tamano={tamano} d={D.puerta} />
  if (giro === 'izquierda') return <Svg tamano={tamano} d={D.izquierda} />
  if (giro === 'derecha') return <Svg tamano={tamano} d={D.derecha} />
  if (giro === 'vuelta') return <Svg tamano={tamano} d={D.vuelta} />
  return <Svg tamano={tamano} d={D.derecho} />
}

/**
 * Íconos SVG embebidos, dibujados con el estilo de Material Symbols (Apache 2.0).
 * Sin logos ni marcas de terceros. Por defecto son decorativos (`aria-hidden`); con `titulo`
 * pasan a ser una imagen con nombre accesible.
 */
import type { ReactNode } from 'react'
import { COLORES_MARCADORES } from '../tema/tokens.ts'
import type { CategoriaLugar } from '../../datos/index.ts'

export interface PropsIcono {
  /** Nombre accesible. Sin título, el ícono es decorativo. */
  titulo?: string
  tamano?: number
  className?: string
}

function Svg({ titulo, tamano = 24, className, children }: PropsIcono & { children: ReactNode }) {
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
      fill="currentColor"
    >
      {children}
    </svg>
  )
}

function Trazo({ d, ...props }: PropsIcono & { d: string }) {
  return (
    <Svg {...props}>
      <path d={d} />
    </Svg>
  )
}

export function IconoLupa(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
    />
  )
}

export function IconoDirecciones(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M21.71 11.29l-9-9a1 1 0 0 0-1.41 0l-9 9a1 1 0 0 0 0 1.41l9 9a1 1 0 0 0 1.41 0l9-9a1 1 0 0 0 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"
    />
  )
}

export function IconoIntercambiar(props: PropsIcono) {
  return (
    <Trazo {...props} d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3 5 6.99h3V14h2V6.99h3L9 3z" />
  )
}

/** Recentrar: un encuadre con un punto, sin la mira del GPS (la app no usa la ubicación). */
export function IconoRecentrar(props: PropsIcono) {
  return (
    <Svg {...props}>
      <path d="M3 5v4h2V5h4V3H5a2 2 0 0 0-2 2zm2 10H3v4a2 2 0 0 0 2 2h4v-2H5v-4zm14 4h-4v2h4a2 2 0 0 0 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function IconoAyuda(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"
    />
  )
}

/** Celular con una flecha hacia abajo (instalar la app). */
export function IconoInstalar(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-1-6h-3V8h-2v5H8l4 4 4-4z"
    />
  )
}

export function IconoInfo(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
  )
}

export function IconoCerrar(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
    />
  )
}

export function IconoVolver(props: PropsIcono) {
  return <Trazo {...props} d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
}

export function IconoReciente(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.95 8.95 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
    />
  )
}

export function IconoSinAcceso(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.9 7.9 0 0 1 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.9 7.9 0 0 1 20 12c0 4.42-3.58 8-8 8z"
    />
  )
}

/** Referencia reconocible (⊙). */
export function IconoReferencia(props: PropsIcono) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

/** Origen: círculo azul con borde blanco (◉). */
export function IconoOrigen(props: PropsIcono) {
  return (
    <Svg {...props}>
      <circle
        cx="12"
        cy="12"
        r="7"
        fill={COLORES_MARCADORES.origen}
        stroke={COLORES_MARCADORES.origenBorde}
        strokeWidth="3"
      />
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="rgb(60 64 67 / .35)" strokeWidth="1" />
    </Svg>
  )
}

/** Destino: pin rojo (▼). Es solo gráfico. */
export function IconoPin(props: PropsIcono) {
  return (
    <Svg {...props}>
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={COLORES_MARCADORES.destino}
        stroke={COLORES_MARCADORES.destinoBorde}
        strokeWidth="1"
      />
      <circle cx="12" cy="9" r="2.5" fill={COLORES_MARCADORES.destinoBorde} />
    </Svg>
  )
}

/** Línea de la ruta, para la leyenda de la ayuda. */
export function IconoLineaRuta(props: PropsIcono) {
  return (
    <Svg {...props}>
      <path
        d="M4 20V12h8V4h8"
        fill="none"
        stroke="var(--color-primario-oscuro)"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M4 20V12h8V4h8"
        fill="none"
        stroke="var(--color-primario)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function IconoAula(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"
    />
  )
}
function IconoLaboratorio(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M19.8 18.4 14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z"
    />
  )
}
function IconoBano(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M5.5 22v-7.5H4V9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v5.5H9.5V22h-4zM18 22v-6h3l-2.54-7.63A2 2 0 0 0 16.56 7h-.12a2 2 0 0 0-1.9 1.37L12 16h3v6h3zM7.5 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
    />
  )
}
function IconoOficina(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-1.99 2L2 19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-6 0h-4V4h4v2z"
    />
  )
}
function IconoServicio(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M20 3H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"
    />
  )
}
function IconoAuditorio(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M4 18v3h3v-3h10v3h3v-6H4zm15-8h3v3h-3zM2 10h3v3H2zm15 3H7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8z"
    />
  )
}
function IconoEntrada(props: PropsIcono) {
  return (
    <Trazo
      {...props}
      d="M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-8v2h8v14z"
    />
  )
}

const POR_CATEGORIA: Record<CategoriaLugar, (p: PropsIcono) => ReactNode> = {
  aula: IconoAula,
  laboratorio: IconoLaboratorio,
  bano: IconoBano,
  oficina: IconoOficina,
  servicio: IconoServicio,
  auditorio: IconoAuditorio,
  entrada: IconoEntrada,
}

/** Ícono de la categoría de un lugar (decorativo salvo que se pase `titulo`). */
export function IconoCategoria({
  categoria,
  ...props
}: PropsIcono & { categoria: CategoriaLugar }) {
  const Componente = POR_CATEGORIA[categoria]
  return <Componente {...props} />
}

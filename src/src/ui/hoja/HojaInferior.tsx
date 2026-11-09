/**
 * Hoja inferior de tres alturas (design.md, D2 y D10). No es modal: el mapa sigue usable.
 * Se arrastra desde la manija y la cabecera (Pointer Events) y desde el cuerpo con el scroll en
 * cero (Touch Events, para poder ganarle al scroll). Solo anima `transform`.
 * En escritorio es un panel lateral sin manija ni alturas.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent as EventoPuntero,
  ReactNode,
  RefObject,
} from 'react'
import { useAnunciar } from '../estado/contexto.ts'
import { useAltoVentana, useAreasSeguras } from '../hooks.ts'
import { TEXTOS } from '../textos.ts'
import { alturaSiguiente, calcularAnclajes, elegirAnclaje } from './anclaje.ts'
import type { Altura } from './anclaje.ts'
import './hoja.css'

export interface PropsHoja {
  /** Id del título del contenido (para `aria-labelledby`). */
  etiquetadaPor: string
  /** Siempre visible, también en la altura colapsada. */
  cabecera: ReactNode
  /** Contenido que se oculta (`inert`) en la altura colapsada. */
  children: ReactNode
  alturaInicial: Altura
  /** Cuando cambia, la hoja vuelve a `alturaInicial`. */
  claveVista: string
  /** Alto de la tarjeta superior, para la altura expandida. */
  altoTarjeta: number
  escritorio: boolean
  /** Publica el alto visible de la hoja (px) cada vez que se ancla. */
  onCambioAlto?: (alto: number, altura: Altura) => void
  /** Pedido de altura desde el contenido: cada `n` nuevo ancla la hoja en `altura`. */
  pedidoAltura?: { altura: Altura; n: number } | null
}

interface Muestra {
  y: number
  t: number
}

const UMBRAL_ARRASTRE = 6

function safeMatches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector)
  } catch {
    return true
  }
}

function velocidadDe(muestras: Muestra[]): number {
  const ultima = muestras[muestras.length - 1]
  if (!ultima) return 0
  const inicio = muestras.find((m) => ultima.t - m.t <= 100) ?? ultima
  const dt = ultima.t - inicio.t
  // Hacia arriba (y decrece) la hoja crece: velocidad positiva.
  return dt > 0 ? (inicio.y - ultima.y) / dt : 0
}

/** Lo que ocupa la manija arriba de la cabecera (44 px con −12 px de margen). */
const ALTO_MANIJA = 32

/**
 * Alto que necesita la hoja para mostrar todo su contenido sin scroll: manija, cabecera,
 * contenido y el relleno de abajo del cuerpo. `0` hasta poder medirlo (jsdom, primer render).
 */
function useAltoContenido(
  cabecera: RefObject<HTMLElement | null>,
  contenido: RefObject<HTMLElement | null>,
  clave: string,
): number {
  const [alto, setAlto] = useState(0)
  useEffect(() => {
    const cab = cabecera.current
    const cont = contenido.current
    if (!cab || !cont || typeof ResizeObserver === 'undefined') return
    const medir = () => {
      const cuerpo = cont.parentElement
      const relleno = cuerpo ? parseFloat(getComputedStyle(cuerpo).paddingBottom) || 0 : 0
      const total = ALTO_MANIJA + cab.offsetHeight + cont.offsetHeight + relleno
      setAlto(cont.offsetHeight > 0 ? Math.ceil(total) : 0)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(cab)
    ro.observe(cont)
    return () => ro.disconnect()
  }, [cabecera, contenido, clave])
  return alto
}

export default function HojaInferior({
  etiquetadaPor,
  cabecera,
  children,
  alturaInicial,
  claveVista,
  altoTarjeta,
  escritorio,
  onCambioAlto,
  pedidoAltura = null,
}: PropsHoja) {
  const altoVentana = useAltoVentana()
  const { arriba, abajo } = useAreasSeguras()
  const cabeceraRef = useRef<HTMLDivElement>(null)
  const contenidoRef = useRef<HTMLDivElement>(null)
  const altoContenido = useAltoContenido(cabeceraRef, contenidoRef, claveVista)
  const anclajes = useMemo(
    () => calcularAnclajes(altoVentana, altoTarjeta, arriba, abajo, altoContenido),
    [altoVentana, altoTarjeta, arriba, abajo, altoContenido],
  )
  const anunciar = useAnunciar()

  const [altura, setAltura] = useState<Altura>(alturaInicial)
  const [arrastre, setArrastre] = useState<number | null>(null)
  const [claveActual, setClaveActual] = useState(claveVista)
  if (claveActual !== claveVista) {
    setClaveActual(claveVista)
    setAltura(alturaInicial)
  }
  const [pedidoVisto, setPedidoVisto] = useState(pedidoAltura?.n ?? 0)
  if (pedidoAltura && pedidoAltura.n !== pedidoVisto) {
    setPedidoVisto(pedidoAltura.n)
    if (!escritorio) setAltura(pedidoAltura.altura)
  }

  const cuerpo = useRef<HTMLDivElement>(null)
  const hoja = useRef<HTMLElement>(null)
  const gesto = useRef<{
    inicioY: number
    inicioAlto: number
    muestras: Muestra[]
    activo: boolean
    puntero: number | null
  } | null>(null)
  const ignorarClic = useRef(false)

  const altoVisible = arrastre ?? anclajes[altura]

  useEffect(() => {
    onCambioAlto?.(escritorio ? 0 : anclajes[altura], altura)
  }, [anclajes, altura, escritorio, onCambioAlto])

  const anclar = useCallback(
    (nueva: Altura, anunciarCambio: boolean) => {
      setAltura(nueva)
      setArrastre(null)
      if (anunciarCambio) anunciar(TEXTOS.altura[nueva])
    },
    [anunciar],
  )

  // ---- Arrastre con Pointer Events (manija y cabecera) ------------------------------------

  const empezar = (y: number, puntero: number | null) => {
    gesto.current = {
      inicioY: y,
      inicioAlto: anclajes[altura],
      muestras: [{ y, t: performance.now() }],
      activo: false,
      puntero,
    }
  }

  const mover = (y: number): boolean => {
    const g = gesto.current
    if (!g) return false
    g.muestras.push({ y, t: performance.now() })
    if (g.muestras.length > 20) g.muestras.shift()
    if (!g.activo && Math.abs(y - g.inicioY) < UMBRAL_ARRASTRE) return false
    g.activo = true
    const alto = g.inicioAlto + (g.inicioY - y)
    setArrastre(Math.min(Math.max(alto, anclajes.colapsada * 0.6), anclajes.expandida))
    return true
  }

  const terminar = () => {
    const g = gesto.current
    gesto.current = null
    if (!g?.activo) return
    ignorarClic.current = true
    const ultimo = g.muestras[g.muestras.length - 1]
    const alto = g.inicioAlto + (g.inicioY - (ultimo?.y ?? g.inicioY))
    anclar(elegirAnclaje(alto, velocidadDe(g.muestras), anclajes), true)
  }

  const alPunteroAbajo = (e: EventoPuntero<HTMLElement>) => {
    if (escritorio || e.button !== 0) return
    empezar(e.clientY, e.pointerId)
  }
  const alPunteroMover = (e: EventoPuntero<HTMLElement>) => {
    const g = gesto.current
    if (!g || g.puntero !== e.pointerId) return
    const eraActivo = g.activo
    if (mover(e.clientY) && !eraActivo) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // El puntero ya no existe.
      }
    }
  }
  const alPunteroArriba = (e: EventoPuntero<HTMLElement>) => {
    if (gesto.current?.puntero !== e.pointerId) return
    terminar()
  }

  // Después de un arrastre, el clic que dispara el navegador no tiene que activar botones.
  const alClicCaptura = (e: MouseEvent) => {
    if (ignorarClic.current) {
      ignorarClic.current = false
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // ---- Arrastre desde el cuerpo (Touch Events) ---------------------------------------------

  useEffect(() => {
    const el = cuerpo.current
    if (!el || escritorio) return
    let decision: 'hoja' | 'scroll' | null = null
    let inicioY = 0
    const alInicio = (e: TouchEvent) => {
      const t = e.touches[0]
      if (e.touches.length !== 1 || !t) return
      decision = null
      inicioY = t.clientY
      empezar(t.clientY, null)
    }
    const alMover = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t || !gesto.current) return
      const dy = t.clientY - inicioY
      if (decision === null && Math.abs(dy) >= UMBRAL_ARRASTRE) {
        const expandida = altura === 'expandida'
        decision = !expandida || (el.scrollTop <= 0 && dy > 0) ? 'hoja' : 'scroll'
      }
      if (decision === 'hoja') {
        e.preventDefault()
        mover(t.clientY)
      }
    }
    const alFin = () => {
      if (decision === 'hoja') terminar()
      else gesto.current = null
      decision = null
    }
    el.addEventListener('touchstart', alInicio, { passive: true })
    el.addEventListener('touchmove', alMover, { passive: false })
    el.addEventListener('touchend', alFin)
    el.addEventListener('touchcancel', alFin)
    return () => {
      el.removeEventListener('touchstart', alInicio)
      el.removeEventListener('touchmove', alMover)
      el.removeEventListener('touchend', alFin)
      el.removeEventListener('touchcancel', alFin)
    }
    // `empezar`, `mover` y `terminar` leen refs y valores actuales de altura/anclajes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [altura, anclajes, escritorio])

  // ---- Teclado en la manija ----------------------------------------------------------------

  const alTecla = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      anclar(alturaSiguiente(altura, 1), true)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      anclar(alturaSiguiente(altura, -1), true)
    }
  }
  const alClicManija = () => anclar(alturaSiguiente(altura, 1, true), true)

  // Si el foco cae en algo que quedó abajo de la pantalla, la hoja se expande.
  const alFoco = (e: FocusEvent) => {
    if (escritorio || altura === 'expandida') return
    const el = e.target as HTMLElement
    // Solo con teclado: un toque no tiene que cambiar la altura.
    if (typeof el.matches === 'function' && !safeMatches(el, ':focus-visible')) return
    const r = el.getBoundingClientRect()
    if (r.bottom > window.innerHeight) anclar('expandida', false)
  }

  // En la altura expandida el contenido scrollea; al bajar vuelve arriba.
  useLayoutEffect(() => {
    if (altura !== 'expandida' && cuerpo.current) cuerpo.current.scrollTop = 0
  }, [altura])

  const estilo = escritorio
    ? undefined
    : {
        height: `${anclajes.expandida}px`,
        transform: `translate3d(0, ${anclajes.expandida - altoVisible}px, 0)`,
      }

  const idAltura = `${etiquetadaPor}-altura`

  return (
    <section
      ref={hoja}
      className={`hoja${arrastre !== null ? ' hoja--arrastrando' : ''}${escritorio ? ' hoja--panel' : ''}`}
      aria-labelledby={etiquetadaPor}
      data-altura={escritorio ? 'panel' : altura}
      style={estilo}
      onClickCapture={alClicCaptura}
      onFocus={alFoco}
    >
      {!escritorio && (
        <button
          type="button"
          className="hoja__manija"
          aria-label={TEXTOS.manija}
          aria-describedby={idAltura}
          onKeyDown={alTecla}
          onClick={alClicManija}
          onPointerDown={alPunteroAbajo}
          onPointerMove={alPunteroMover}
          onPointerUp={alPunteroArriba}
          onPointerCancel={alPunteroArriba}
        >
          <span className="hoja__barrita" aria-hidden="true" />
          <span id={idAltura} className="solo-lector">
            {TEXTOS.altura[altura]}
          </span>
        </button>
      )}
      <div
        ref={cabeceraRef}
        className="hoja__cabecera"
        onPointerDown={alPunteroAbajo}
        onPointerMove={alPunteroMover}
        onPointerUp={alPunteroArriba}
        onPointerCancel={alPunteroArriba}
      >
        {cabecera}
      </div>
      <div
        ref={cuerpo}
        className="hoja__cuerpo"
        data-scroll={escritorio || altura === 'expandida' ? 'si' : 'no'}
        inert={!escritorio && altura === 'colapsada'}
      >
        <div ref={contenidoRef} className="hoja__contenido">
          {children}
        </div>
      </div>
    </section>
  )
}

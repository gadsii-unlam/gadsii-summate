/**
 * Contenido de la hoja cuando hay una ruta (design.md de mostrar-ruta-e-indicaciones, decisiones
 * 1, 6, 7, 12 y 14): "Buscando el camino…", tarjeta resumen y chips de alternativas con el botón
 * "Iniciar"; una vez iniciado, el resumen y "Finalizar viaje". La app no da indicaciones paso a
 * paso: el camino se sigue en el mapa.
 *
 * Recibe el estado del orquestador (o directamente un `PlanDeRuta`) por props, así se prueba
 * aislado. La alternativa elegida es estado propio; los cambios se avisan por callbacks para que
 * el mapa (`CapaRuta`) reaccione.
 */
import { useEffect, useMemo, useState } from 'react'
import type { EstadoOrquestador, PlanDeRuta } from '../../clima/index.ts'
import type { Lugar } from '../../datos/index.ts'
import { textoAnuncioRuta, type Criterio, type RutaEncontrada } from '../../rutas/index.ts'
import ChipsAlternativas from './ChipsAlternativas.tsx'
import EsperaRuta from './EsperaRuta.tsx'
import { modeloResultado, type ModeloResultado } from './modelo.ts'
import TarjetaResumen from './TarjetaResumen.tsx'
import { EVENTO_FINALIZAR_VIAJE, TEXTOS_RUTA } from './textos.ts'
import { useEsperaVisible } from './useEspera.ts'
import './ruta.css'

/** Lo que se dibuja en el mapa: la ruta elegida y la alternativa (o `null`). */
export interface SeleccionRuta {
  criterio: Criterio
  elegida: RutaEncontrada
  alternativa: RutaEncontrada | null
}

export interface PropsResultadoRuta {
  origen: Lugar
  destino: Lugar
  /** Estado del orquestador de `adaptar-ruta-al-clima` o un plan ya armado. */
  estado: EstadoOrquestador | PlanDeRuta
  /**
   * Criterio elegido desde afuera (por ejemplo, al tocar la línea gris en el mapa). Si se pasa,
   * manda sobre el estado propio.
   */
  elegida?: Criterio | null
  /** Cambió la ruta que se ve (ruta nueva, chip o línea gris) o dejó de haber ruta (`null`). */
  alCambiarSeleccion?: (seleccion: SeleccionRuta | null) => void
  /** Se tocó un chip (también se avisa por `alCambiarSeleccion`). */
  alElegir?: (criterio: Criterio) => void
  /** "Iniciar": el recorrido empieza (el mapa se acerca al punto de partida). */
  alIniciar?: () => void
  /** "Finalizar viaje": además se emite `EVENTO_FINALIZAR_VIAJE` en `window`. */
  alFinalizar?: () => void
  /** Aviso extra para la ruta que se ve (el desvío por cierres: "Evitamos un tramo cerrado: …"). */
  avisoDe?: (seleccion: SeleccionRuta) => string | null
  /** Demora y mínimo del indicador de espera (para tests). */
  esperaMs?: { demora: number; minimo: number }
}

type Listo = Extract<ModeloResultado, { tipo: 'ruta' }>

function rutaDe(modelo: Listo, criterio: Criterio): SeleccionRuta {
  const elegida = modelo.opciones.find((o) => o.criterio === criterio) ?? modelo.opciones[0]!
  const otra = modelo.opciones.find((o) => o !== elegida)
  return { criterio: elegida.criterio, elegida: elegida.ruta, alternativa: otra?.ruta ?? null }
}

export default function ResultadoRuta({
  origen,
  destino,
  estado,
  elegida: elegidaExterna = null,
  alCambiarSeleccion,
  alElegir,
  alIniciar,
  alFinalizar,
  avisoDe,
  esperaMs,
}: PropsResultadoRuta) {
  const modelo = useMemo(() => modeloResultado(estado), [estado])
  const listo = modelo.tipo === 'ruta' ? modelo : null
  const plan = listo?.plan ?? null

  // Estado propio, que se reinicia con cada plan nuevo (patrón "estado derivado de props").
  const [planBase, setPlanBase] = useState(plan)
  const [elegidaPropia, setElegidaPropia] = useState<Criterio | null>(null)
  const [iniciado, setIniciado] = useState(false)
  if (planBase !== plan) {
    setPlanBase(plan)
    setElegidaPropia(null)
    setIniciado(false)
  }

  const criterio = elegidaExterna ?? elegidaPropia ?? listo?.opciones[0]?.criterio ?? null
  const seleccion = useMemo(
    () => (listo && criterio ? rutaDe(listo, criterio) : null),
    [listo, criterio],
  )
  const rutaVista = seleccion?.elegida ?? null

  const buscando = modelo.tipo === 'buscando'
  const esperaVisible = useEsperaVisible(buscando, esperaMs?.demora, esperaMs?.minimo)

  // Mientras se ve "Buscando el camino…" el mapa no muestra ninguna ruta.
  const mostrada = esperaVisible ? null : seleccion
  const claveSeleccion = mostrada
    ? `${mostrada.criterio}|${mostrada.elegida.nodos.join()}|${mostrada.alternativa?.nodos.join() ?? ''}`
    : ''
  const avisarSeleccion = alCambiarSeleccion
  useEffect(() => {
    avisarSeleccion?.(mostrada)
    // Solo cuando cambia lo que se ve (la clave), no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveSeleccion])

  if (esperaVisible) return <EsperaRuta origen={origen.nombre} destino={destino.nombre} />
  if (!listo || !rutaVista || !criterio) {
    return <div className="ruta-resultado" data-testid="ruta-resultado-vacio" hidden />
  }

  const aviso = seleccion && avisoDe ? avisoDe(seleccion) : null
  const anuncio = (
    <p className="ruta-solo-lector" role="status">
      {textoAnuncioRuta(rutaVista)}
    </p>
  )

  const elegir = (c: Criterio) => {
    if (c === criterio) return
    setElegidaPropia(c)
    alElegir?.(c)
  }

  const iniciar = () => {
    setIniciado(true)
    alIniciar?.()
  }

  const finalizar = () => {
    window.dispatchEvent(new CustomEvent(EVENTO_FINALIZAR_VIAJE))
    alFinalizar?.()
  }

  return (
    <div className="ruta-resultado" data-testid="ruta-resultado">
      {anuncio}
      {aviso && (
        <p className="ruta-resultado__desvio" data-testid="ruta-desvio">
          {aviso}
        </p>
      )}
      <TarjetaResumen ruta={rutaVista} llueve={listo.llueve} nota={listo.nota} />
      {!iniciado && (
        <ChipsAlternativas opciones={listo.opciones} elegida={criterio} alElegir={elegir} />
      )}
      <div className="ruta-resultado__acciones">
        {iniciado ? (
          <button type="button" className="boton boton--secundario" onClick={finalizar}>
            {TEXTOS_RUTA.finalizar}
          </button>
        ) : (
          <button type="button" className="boton boton--primario" onClick={iniciar}>
            {TEXTOS_RUTA.iniciar}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Búsqueda a pantalla completa (design.md, D1 vista 2, D6 y D10). Es el mismo componente para el
 * destino y el origen. Patrón combobox: el foco queda en el campo y las flechas recorren la lista
 * con `aria-activedescendant`.
 */
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { buscar } from '../../busqueda/index.ts'
import type { Lugar } from '../../datos/index.ts'
import { useCatalogo } from '../catalogo.ts'
import { usePantalla } from '../estado/contexto.ts'
import type { Vista } from '../estado/pantalla.ts'
import { useAltoVisible, useArribaVisible } from '../hooks.ts'
import { IconoCerrar, IconoVolver } from '../iconos/Iconos.tsx'
import { useIntegraciones } from '../integraciones.ts'
import { TEXTOS } from '../textos.ts'
import { ContenidoFila } from './FilaLugar.tsx'
import type { TipoFila } from './FilaLugar.tsx'
import './busqueda.css'

interface Opcion {
  clave: string
  lugar: Lugar
  tipo: TipoFila
  resaltado?: Array<[number, number]>
}

interface Grupo {
  titulo: string | null
  opciones: Opcion[]
}

const DEMORA_ANUNCIO = 500

type VistaBuscando = Extract<Vista, { tipo: 'buscando' }>

export default function Busqueda({ vista }: { vista: VistaBuscando }) {
  const { pantalla, recientes, recientesOrigen, despachar, volver, quitarReciente } = usePantalla()
  const catalogo = useCatalogo()
  const { estadoAcceso } = useIntegraciones()
  const id = useId()
  const campoRef = useRef<HTMLInputElement>(null)
  const altoVisible = useAltoVisible()
  const arribaVisible = useArribaVisible()

  const consulta = pantalla.consulta
  const diferida = useDeferredValue(consulta)
  const textoLimpio = diferida.trim()
  const esOrigen = vista.campo === 'origen'

  const resultados = useMemo(
    () => (textoLimpio ? buscar(catalogo.indice, textoLimpio) : []),
    [catalogo.indice, textoLimpio],
  )

  const grupos = useMemo<Grupo[]>(() => {
    const comoOpciones = (lugares: Lugar[], tipo: TipoFila, prefijo: string): Opcion[] =>
      lugares.map((lugar) => ({ clave: `${prefijo}-${lugar.id}`, lugar, tipo }))
    const deReferencia: Grupo = {
      titulo: TEXTOS.referencias,
      opciones: comoOpciones(catalogo.referencias, 'referencia', 'ref'),
    }
    const entradas: Grupo = {
      titulo: TEXTOS.entradasAlCampus,
      opciones: comoOpciones(catalogo.entradas, 'referencia', 'ent'),
    }

    if (textoLimpio) {
      if (resultados.length === 0) return [deReferencia]
      return [
        {
          titulo: null,
          opciones: resultados.map((r) => ({
            clave: `res-${r.lugar.id}`,
            lugar: r.lugar,
            tipo: 'resultado',
            resaltado: r.resaltado,
          })),
        },
      ]
    }
    if (vista.filtro === 'entradas') return [entradas]
    if (esOrigen) {
      // Origen: recientes de origen, entradas al campus y lugares de referencia.
      const origenesRecientes = recientesOrigen
        .map((r) => catalogo.porId.get(r))
        .filter((l): l is Lugar => !!l)
      return [
        ...(origenesRecientes.length
          ? [
              {
                titulo: TEXTOS.recientes,
                opciones: comoOpciones(origenesRecientes, 'reciente', 'rec'),
              },
            ]
          : []),
        entradas,
        deReferencia,
      ]
    }
    const lugaresRecientes = recientes
      .map((r) => catalogo.porId.get(r))
      .filter((l): l is Lugar => !!l)
    return [
      ...(lugaresRecientes.length
        ? [
            {
              titulo: TEXTOS.recientes,
              opciones: comoOpciones(lugaresRecientes, 'reciente', 'rec'),
            },
          ]
        : []),
      { ...deReferencia, opciones: [...deReferencia.opciones, ...entradas.opciones] },
    ]
  }, [textoLimpio, resultados, vista.filtro, esOrigen, recientesOrigen, recientes, catalogo])

  const opciones = useMemo(() => grupos.flatMap((g) => g.opciones), [grupos])
  const sinResultados = !!textoLimpio && resultados.length === 0

  const [activa, setActiva] = useState(-1)
  const [opcionesPrevias, setOpcionesPrevias] = useState(opciones)
  if (opcionesPrevias !== opciones) {
    setOpcionesPrevias(opciones)
    setActiva(-1)
  }

  // Foco automático (abre el teclado en el celular).
  useEffect(() => {
    campoRef.current?.focus()
  }, [])

  // Anuncio de la cantidad de resultados medio segundo después de dejar de tipear.
  const [anuncio, setAnuncio] = useState('')
  useEffect(() => {
    const texto = consulta.trim()
    const t = window.setTimeout(() => {
      if (!texto) setAnuncio('')
      else {
        const n = buscar(catalogo.indice, texto).length
        setAnuncio(n ? TEXTOS.resultados(n) : TEXTOS.sinResultadosAnuncio(texto))
      }
    }, DEMORA_ANUNCIO)
    return () => window.clearTimeout(t)
  }, [consulta, catalogo.indice])

  // La opción activa queda a la vista.
  useEffect(() => {
    if (activa < 0) return
    document.getElementById(`${id}-op-${activa}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [activa, id])

  const elegir = (lugar: Lugar) => despachar({ tipo: 'elegir-resultado', lugarId: lugar.id })

  const alTecla = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiva((i) => (opciones.length ? (i + 1) % opciones.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiva((i) => (opciones.length ? (i <= 0 ? opciones.length - 1 : i - 1) : -1))
    } else if (e.key === 'Enter') {
      // Sin opción activa vale lo que está escrito ahora: si el texto diferido todavía no se
      // alcanzó a procesar (Enter justo después de tipear), se busca con la consulta actual.
      const texto = consulta.trim()
      let lugar: Lugar | undefined
      if (activa >= 0) lugar = opciones[activa]?.lugar
      else if (texto && texto === textoLimpio) lugar = opciones[0]?.lugar
      else if (texto) lugar = buscar(catalogo.indice, texto)[0]?.lugar ?? catalogo.referencias[0]
      if (lugar) {
        e.preventDefault()
        elegir(lugar)
      }
    } else if (e.key === 'Delete' && activa >= 0 && opciones[activa]?.tipo === 'reciente') {
      // La cruz de un reciente no es un control propio (no puede ir dentro de una opción):
      // con el teclado se quita con Supr sobre la opción activa.
      e.preventDefault()
      quitarReciente(esOrigen ? 'origen' : 'destino', opciones[activa].lugar.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      volver()
    }
  }

  const idLista = `${id}-lista`
  const etiqueta = esOrigen ? TEXTOS.elegirPartida : TEXTOS.buscarLugar
  let indice = -1

  return (
    <div
      className="busqueda"
      role="dialog"
      aria-modal="true"
      aria-label={etiqueta}
      style={{ height: `${altoVisible}px`, top: `${arribaVisible}px` }}
    >
      <div className="busqueda__barra">
        <button type="button" className="boton-icono" aria-label={TEXTOS.volver} onClick={volver}>
          <IconoVolver />
        </button>
        <input
          ref={campoRef}
          className="busqueda__campo"
          type="text"
          role="combobox"
          aria-label={esOrigen ? TEXTOS.tituloOrigen : TEXTOS.destinoVacio}
          aria-expanded={opciones.length > 0}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={activa >= 0 ? `${id}-op-${activa}` : undefined}
          placeholder={esOrigen ? TEXTOS.placeholderOrigen : TEXTOS.placeholderDestino}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          value={consulta}
          onChange={(e) => despachar({ tipo: 'escribir', consulta: e.target.value })}
          onKeyDown={alTecla}
        />
        {consulta && (
          <button
            type="button"
            className="boton-icono"
            aria-label={TEXTOS.borrarTexto}
            onClick={() => {
              despachar({ tipo: 'escribir', consulta: '' })
              campoRef.current?.focus()
            }}
          >
            <IconoCerrar />
          </button>
        )}
      </div>

      <div className="busqueda__contenido">
        {!consulta && <p className="ayuda-breve busqueda__ejemplo">{TEXTOS.ejemploBusqueda}</p>}
        {sinResultados && (
          <div className="busqueda__vacio">
            <p className="busqueda__vacio-titulo">{TEXTOS.sinResultados(textoLimpio)}</p>
            <p className="ayuda-breve">{TEXTOS.sinResultadosSugerencia}</p>
          </div>
        )}
        <div role="listbox" id={idLista} aria-label={etiqueta} className="busqueda__lista">
          {grupos.map((g, gi) => {
            const idTitulo = `${id}-g-${gi}`
            const filas = g.opciones.map((o) => {
              indice += 1
              const i = indice
              const idOp = `${id}-op-${i}`
              const sinAcceso = o.tipo !== 'sugerencia' && estadoAcceso(o.lugar.id) === 'sin-acceso'
              return (
                // El teclado lo maneja el combobox (aria-activedescendant).
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <div
                  key={o.clave}
                  id={idOp}
                  role="option"
                  tabIndex={-1}
                  aria-selected={i === activa}
                  aria-keyshortcuts={o.tipo === 'reciente' ? 'Delete' : undefined}
                  aria-describedby={`${idOp}-d${sinAcceso ? ` ${idOp}-e` : ''}`}
                  className={`fila${i === activa ? ' fila--activa' : ''}`}
                  onClick={() => elegir(o.lugar)}
                >
                  <ContenidoFila
                    lugar={o.lugar}
                    tipo={o.tipo}
                    sinAcceso={sinAcceso}
                    idDetalle={`${idOp}-d`}
                    idEstado={`${idOp}-e`}
                    {...(o.resaltado ? { resaltado: o.resaltado } : {})}
                  />
                  {o.tipo === 'reciente' && (
                    // No es un botón: un control interactivo no puede ir dentro de una opción
                    // (`nested-interactive`). Con el teclado se quita con Supr (ver `alTecla`).
                    <span
                      className="boton-icono boton-icono--chico fila__quitar"
                      aria-hidden="true"
                      title={TEXTOS.quitarReciente(o.lugar.nombre)}
                      onClick={(e) => {
                        e.stopPropagation()
                        quitarReciente(esOrigen ? 'origen' : 'destino', o.lugar.id)
                      }}
                    >
                      <IconoCerrar tamano={20} />
                    </span>
                  )}
                </div>
              )
            })
            return g.titulo ? (
              <div key={gi} role="group" aria-labelledby={idTitulo}>
                <div id={idTitulo} className="busqueda__seccion" role="presentation">
                  {g.titulo}
                </div>
                {filas}
              </div>
            ) : (
              <div key={gi} role="group" aria-label={etiqueta}>
                {filas}
              </div>
            )
          })}
        </div>
      </div>
      <div className="solo-lector" aria-live="polite" role="status">
        {anuncio}
      </div>
    </div>
  )
}

/**
 * Pantalla única de ¿Dónde queda? (design.md, D1): el mapa a pantalla completa que nunca se
 * desmonta y, encima, los botones circulares, la hoja inferior, la tarjeta superior y las capas
 * de búsqueda y ayuda.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ComponentType, MouseEvent } from 'react'
import type { PlanoBase } from '../datos/index.ts'
import Ayuda from './ayuda/Ayuda.tsx'
import type { SimboloLeyenda } from './ayuda/Ayuda.tsx'
import Busqueda from './busqueda/Busqueda.tsx'
import { ContextoCatalogo, useCatalogo } from './catalogo.ts'
import type { CatalogoUI } from './catalogo.ts'
import ContenidoRutaProvisional from './contenido/ContenidoRutaProvisional.tsx'
import { useContenidoComoLlegar } from './contenido/ContenidoComoLlegar.tsx'
import {
  ID_TITULO_HOJA,
  useContenidoInicio,
  useMostrarPrimerUso,
} from './contenido/ContenidoInicio.tsx'
import type { ContenidoHoja } from './contenido/ContenidoInicio.tsx'
import { CabeceraFicha, CuerpoFicha } from './contenido/FichaLugar.tsx'
import type { Almacen } from './estado/almacen.ts'
import { ContextoAnunciar, usePantalla } from './estado/contexto.ts'
import PantallaProvider from './estado/PantallaProvider.tsx'
import { INICIO, vistaBase } from './estado/pantalla.ts'
import type { Seleccion, VistaBase } from './estado/pantalla.ts'
import HojaInferior from './hoja/HojaInferior.tsx'
import type { Altura } from './hoja/anclaje.ts'
import { useAltoElemento, useAltoVentana, useAreasSeguras, useEsEscritorio } from './hooks.ts'
import { IconoAyuda, IconoDirecciones, IconoRecentrar } from './iconos/Iconos.tsx'
import {
  ContextoIntegraciones,
  accesoPorDefecto,
  solicitarRutaProvisional,
  useIntegraciones,
} from './integraciones.ts'
import type { Integraciones } from './integraciones.ts'
import type { Encuadre, Margenes, PropsMapa } from './mapa/tipos.ts'
import type { Caja } from '../datos/index.ts'
import { ContextoVistaPantalla } from './estado/vistaPantalla.ts'
import type { VistaPantalla } from './estado/vistaPantalla.ts'
import {
  BarraBusqueda,
  ChipsReferencias,
  TarjetaComoLlegar,
  TarjetaTitulo,
} from './tarjeta/Tarjetas.tsx'
import { TEXTOS } from './textos.ts'
import type { PropsPulsacionLarga } from './clima/usePulsacionLarga.ts'
import './pantalla.css'

export const ANCHO_PANEL = 408

export interface PropsPantalla {
  catalogo: CatalogoUI
  plano: PlanoBase
  /** `MapaCampus` (Leaflet) en la app; `MapaDoble` en los tests de componentes. */
  Mapa: ComponentType<PropsMapa>
  integraciones?: Partial<Integraciones>
  almacen?: Almacen
  /** Para `tolerar-senal-irregular`: selección de un recorrido vigente. */
  seleccionInicial?: Pick<Seleccion, 'origen' | 'destino'>
  /** Con `seleccionInicial`, abre directo "Cómo llegar" (recorrido restaurado al recargar). */
  abrirComoLlegar?: boolean
  /** Cada cambio de la selección de origen y destino (para guardar el recorrido). */
  alCambiarSeleccion?: (seleccion: Seleccion) => void
  /** Símbolos extra para la leyenda de la ayuda (cambios 4 y 7). */
  simbolosLeyenda?: SimboloLeyenda[]
  /** Props extra del botón `(?)`: el gesto oculto del panel de prueba (adaptar-ruta-al-clima). */
  propsBotonAyuda?: PropsPulsacionLarga
}

const POR_DEFECTO: Integraciones = {
  solicitarRuta: solicitarRutaProvisional,
  estadoAcceso: accesoPorDefecto,
  ContenidoRuta: ContenidoRutaProvisional,
  AvisoClima: null,
  CapasMapa: null,
  encuadreRuta: () => null,
  Avisos: null,
  ExtraAyuda: null,
  BotonInstalar: null,
}

export default function Pantalla({
  catalogo,
  plano,
  Mapa,
  integraciones,
  almacen,
  seleccionInicial,
  abrirComoLlegar,
  alCambiarSeleccion,
  simbolosLeyenda,
  propsBotonAyuda,
}: PropsPantalla) {
  const valor = useMemo<Integraciones>(
    () => ({ ...POR_DEFECTO, ...integraciones }),
    [integraciones],
  )
  const existeLugar = useCallback((id: string) => catalogo.porId.has(id), [catalogo])
  const [anuncio, setAnuncio] = useState('')
  const anunciar = useCallback((texto: string) => {
    setAnuncio('')
    window.setTimeout(() => setAnuncio(texto), 50)
  }, [])

  return (
    <ContextoCatalogo.Provider value={catalogo}>
      <ContextoIntegraciones.Provider value={valor}>
        <ContextoAnunciar.Provider value={anunciar}>
          <PantallaProvider
            existeLugar={existeLugar}
            solicitarRuta={valor.solicitarRuta}
            {...(almacen ? { almacen } : {})}
            {...(seleccionInicial ? { seleccionInicial } : {})}
            {...(abrirComoLlegar ? { abrirComoLlegar } : {})}
            {...(alCambiarSeleccion ? { alCambiarSeleccion } : {})}
          >
            <Disposicion
              plano={plano}
              Mapa={Mapa}
              simbolosLeyenda={simbolosLeyenda ?? []}
              propsBotonAyuda={propsBotonAyuda}
            />
          </PantallaProvider>
          <div className="solo-lector" aria-live="polite" data-testid="anunciador">
            {anuncio}
          </div>
        </ContextoAnunciar.Provider>
      </ContextoIntegraciones.Provider>
    </ContextoCatalogo.Provider>
  )
}

/** Vista que se ve debajo de la búsqueda o de la ayuda. */
function vistaDeFondo(base: VistaBase): VistaBase {
  // Siempre "Cómo llegar": la barra de inicio y la ficha ya no se muestran.
  if (base.tipo === 'inicio' || base.tipo === 'ficha') return INICIO
  if (base.tipo !== 'buscando') return base
  return { tipo: 'como-llegar' }
}

function Disposicion({
  plano,
  Mapa,
  simbolosLeyenda,
  propsBotonAyuda,
}: {
  plano: PlanoBase
  Mapa: ComponentType<PropsMapa>
  simbolosLeyenda: SimboloLeyenda[]
  propsBotonAyuda: PropsPulsacionLarga | undefined
}) {
  const { pantalla, fase, volver, despachar } = usePantalla()
  const catalogo = useCatalogo()
  const { CapasMapa, encuadreRuta, Avisos, AvisoClima, ExtraAyuda, BotonInstalar } =
    useIntegraciones()
  const altoVentana = useAltoVentana()
  const escritorio = useEsEscritorio()
  const { arriba, abajo: abajoSeguro } = useAreasSeguras()
  const primerUso = useMostrarPrimerUso()

  const tarjetaRef = useRef<HTMLDivElement>(null)
  const altoTarjeta = useAltoElemento(tarjetaRef)
  const botonesRef = useRef<HTMLDivElement>(null)
  const altoBotones = useAltoElemento(botonesRef)
  const [, setHoja] = useState<{ alto: number; altura: Altura }>({
    alto: 0,
    altura: 'colapsada',
  })
  const alCambioAlto = useCallback((alto: number, altura: Altura) => setHoja({ alto, altura }), [])
  const [pedidoAltura, setPedidoAltura] = useState<{ altura: Altura; n: number } | null>(null)
  const pedirAltura = useCallback(
    (altura: Altura) => setPedidoAltura((p) => ({ altura, n: (p?.n ?? 0) + 1 })),
    [],
  )
  const [recentrar, setRecentrar] = useState(0)
  const { controlador } = usePantalla()
  useEffect(() => controlador.usarEscritorio(escritorio), [controlador, escritorio])

  const vista = pantalla.vista
  const base = vistaBase(vista)
  let fondo = vistaDeFondo(base)
  const lugarFicha = fondo.tipo === 'ficha' ? (catalogo.porId.get(fondo.lugarId) ?? null) : null
  if (fondo.tipo === 'ficha' && !lugarFicha) fondo = INICIO
  const destino = pantalla.seleccion.destino
    ? catalogo.porId.get(pantalla.seleccion.destino)
    : undefined
  const origen = pantalla.seleccion.origen
    ? catalogo.porId.get(pantalla.seleccion.origen)
    : undefined

  const contenidoInicio = useContenidoInicio()
  const contenidoComoLlegar = useContenidoComoLlegar()
  let contenido: ContenidoHoja
  let alturaInicial: Altura
  if (fondo.tipo === 'ficha' && lugarFicha) {
    contenido = {
      cabecera: <CabeceraFicha lugar={lugarFicha} />,
      cuerpo: <CuerpoFicha lugar={lugarFicha} />,
    }
    alturaInicial = 'media'
  } else if (fondo.tipo === 'como-llegar') {
    contenido = contenidoComoLlegar
    alturaInicial = 'media'
  } else {
    contenido = contenidoInicio
    alturaInicial = primerUso ? 'media' : 'colapsada'
  }
  const claveVista = fondo.tipo === 'ficha' ? `ficha:${fondo.lugarId}` : fondo.tipo

  // ---- Mapa: encuadre, marcador y márgenes ------------------------------------------------
  const [ultimaCaja, setUltimaCaja] = useState<{ par: string; caja: Caja } | null>(null)
  let encuadre: Encuadre = { tipo: 'campus' }
  let marcador: PropsMapa['marcador'] = null
  if (lugarFicha) {
    marcador = catalogo.ubicar(lugarFicha)
    encuadre = { tipo: 'lugar', x: marcador.x, y: marcador.y }
  } else if (fondo.tipo === 'como-llegar' && (destino || origen)) {
    // Con un solo punto, el zoom va a ese punto; con los dos, a la ruta completa.
    marcador = destino ? catalogo.ubicar(destino) : { ...catalogo.ubicar(origen!), tipo: 'origen' }
    let caja = fase === 'ruta' && origen && destino ? encuadreRuta(origen.id, destino.id) : null
    // Mientras la ruta se recalcula (por ejemplo, al intercambiar), se encuadran los dos puntos
    // para no saltar al destino.
    const par = origen && destino ? [origen.id, destino.id].sort().join('|') : ''
    const igual = (a: Caja, b: Caja) =>
      a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2
    if (caja && (ultimaCaja?.par !== par || !igual(ultimaCaja.caja, caja))) {
      setUltimaCaja({ par, caja })
    } else if (!caja && fase === 'ruta' && ultimaCaja?.par === par) {
      caja = ultimaCaja.caja
    }
    if (!caja && fase === 'ruta' && origen && destino) {
      const a = catalogo.ubicar(origen)
      const b = catalogo.ubicar(destino)
      caja = {
        x1: Math.min(a.x, b.x),
        y1: Math.min(a.y, b.y),
        x2: Math.max(a.x, b.x),
        y2: Math.max(a.y, b.y),
      }
    }
    encuadre = caja ? { tipo: 'ruta', caja } : { tipo: 'lugar', x: marcador.x, y: marcador.y }
    // Con una ruta dibujada, el pin de destino es el de la ruta (en la puerta que usa).
    if (caja) marcador = null
  }
  const margenes: Margenes = useMemo(
    () =>
      escritorio
        ? // En escritorio el mapa empieza a la derecha del panel (pantalla.css): no hay nada tapado.
          { arriba: 0, abajo: 0, izquierda: 0, derecha: 0, abajoColapsada: 0 }
        : {
            arriba: arriba + 8 + altoTarjeta,
            // Los botones circulares flotan abajo a la derecha: se reserva su alto para que el
            // encuadre (por ejemplo, el destino de una ruta) no quede tapado por ellos.
            abajo: altoBotones > 0 ? abajoSeguro + 16 + altoBotones : 0,
            izquierda: 0,
            derecha: 0,
            abajoColapsada: 0,
          },
    [escritorio, arriba, altoTarjeta, abajoSeguro, altoBotones],
  )
  const vistaPantalla = useMemo<VistaPantalla>(
    () => ({ margenes, escritorio, pedirAltura }),
    [margenes, escritorio, pedirAltura],
  )

  // ---- Capas y foco -------------------------------------------------------------------------
  const buscando = base.tipo === 'buscando' ? base : null
  const ayudaAbierta = vista.tipo === 'ayuda'
  const capaAbierta = !!buscando || ayudaAbierta

  const focoRetorno = useRef<string | null>(null)
  const alClicCaptura = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-foco]')
    if (el?.dataset.foco) focoRetorno.current = el.dataset.foco
  }
  const capaPrevia = useRef(capaAbierta)
  useEffect(() => {
    const habia = capaPrevia.current
    capaPrevia.current = capaAbierta
    if (!habia || capaAbierta || !focoRetorno.current) return
    if (fondo.tipo === 'ficha' && !ayudaAbierta && focoRetorno.current !== 'ayuda') return
    const selector = `[data-foco="${focoRetorno.current}"]`
    const id = window.setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [capaAbierta, ayudaAbierta, fondo.tipo])

  // `Esc` cierra la última capa (la búsqueda maneja su propio `Esc`).
  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (vista.tipo === 'inicio' || vista.tipo === 'buscando') return
      volver()
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [vista.tipo, volver])

  // En celular no hay hoja inferior: solo una acción centrada abajo (si corresponde).
  const enViaje = fondo.tipo === 'como-llegar' && fase === 'ruta'
  const ocultarBotones = false
  const estiloBotones = escritorio ? undefined : { bottom: `${abajoSeguro + 16}px` }

  return (
    <ContextoVistaPantalla.Provider value={vistaPantalla}>
      {/* El clic (en captura) solo recuerda a qué control devolver el foco. */}
      <div
        className={`pantalla${escritorio ? ' pantalla--escritorio' : ''}`}
        onClickCapture={alClicCaptura}
        style={
          escritorio
            ? ({ '--alto-tarjeta-panel': `${altoTarjeta + 32}px` } as CSSProperties)
            : undefined
        }
      >
        <main className="pantalla__principal" inert={capaAbierta}>
          <h1 className="solo-lector">{TEXTOS.app}</h1>
          <div className="pantalla__mapa" role="region" aria-label={TEXTOS.mapa}>
            <Mapa
              plano={plano}
              encuadre={encuadre}
              marcador={marcador}
              margenes={margenes}
              recentrar={recentrar}
              escritorio={escritorio}
              Capas={CapasMapa}
            />
          </div>

          <div
            ref={botonesRef}
            className="botones-flotantes"
            style={estiloBotones}
            hidden={ocultarBotones}
          >
            {BotonInstalar && !primerUso && <BotonInstalar />}
            <button
              type="button"
              className="boton-circular"
              aria-label={TEXTOS.ayuda}
              data-foco="ayuda"
              {...propsBotonAyuda}
              onClick={() => despachar({ tipo: 'abrir-ayuda' })}
            >
              <IconoAyuda />
            </button>
            <button
              type="button"
              className="boton-circular"
              aria-label={TEXTOS.recentrar}
              onClick={() => setRecentrar((n) => n + 1)}
            >
              <IconoRecentrar />
            </button>
          </div>

          {escritorio ? (
            <HojaInferior
              etiquetadaPor={ID_TITULO_HOJA}
              cabecera={contenido.cabecera}
              alturaInicial={alturaInicial}
              claveVista={claveVista}
              altoTarjeta={altoTarjeta}
              escritorio={escritorio}
              onCambioAlto={alCambioAlto}
              pedidoAltura={pedidoAltura}
            >
              {contenido.cuerpo}
            </HojaInferior>
          ) : (
            <>
              {/* Montado pero oculto: dibuja la ruta en el mapa. */}
              {fondo.tipo === 'como-llegar' && <div hidden>{contenido.cuerpo}</div>}
              {(enViaje || lugarFicha) && (
                <div className="accion-inferior" style={{ bottom: `${abajoSeguro + 16}px` }}>
                  {enViaje ? (
                    <button
                      type="button"
                      className="boton boton--primario"
                      onClick={() => despachar({ tipo: 'limpiar' })}
                    >
                      {TEXTOS.cancelar}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="boton boton--primario"
                      data-foco="como-llegar"
                      onClick={() => despachar({ tipo: 'abrir-como-llegar' })}
                    >
                      <IconoDirecciones tamano={20} />
                      {TEXTOS.comoLlegar}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="tarjeta-superior" ref={tarjetaRef} data-vista={fondo.tipo}>
            {fondo.tipo === 'ficha' && lugarFicha ? (
              <TarjetaTitulo lugar={lugarFicha} />
            ) : fondo.tipo === 'como-llegar' ? (
              <TarjetaComoLlegar />
            ) : (
              <>
                <BarraBusqueda />
                <ChipsReferencias />
              </>
            )}
          </div>

          {escritorio ? (
            Avisos && (
              <Avisos
                altoVentana={altoVentana}
                altoHoja={0}
                bordeTarjeta={arriba + 8 + altoTarjeta}
                escritorio
              />
            )
          ) : (
            /* Celular: debajo de la tarjeta, el aviso del clima (sin hoja, es la única forma de
               ver la pregunta «¿Cómo querés ir?» cuando falla el clima) y la barra «Sin conexión». */
            <div
              className="avisos-arriba"
              hidden={Boolean(buscando)}
              style={{ top: `${arriba + 16 + altoTarjeta}px` }}
            >
              {enViaje && AvisoClima && origen && destino && (
                <div className="avisos-arriba__clima">
                  <AvisoClima origen={origen} destino={destino} />
                </div>
              )}
              {Avisos && (
                <Avisos
                  altoVentana={altoVentana}
                  // La pila de avisos crece desde abajo: arranca por encima de los botones
                  // flotantes y de "Cancelar" (mismo `bottom`, 44 px de alto) para no quedar tapada.
                  altoHoja={Math.max(margenes.abajo, abajoSeguro + 16 + 44)}
                  bordeTarjeta={arriba + 8 + altoTarjeta}
                  escritorio={false}
                />
              )}
            </div>
          )}
        </main>

        {buscando && <Busqueda key={`${buscando.campo}-${buscando.desde}`} vista={buscando} />}
        {ayudaAbierta && (
          <Ayuda simbolosExtra={simbolosLeyenda} extra={ExtraAyuda ? <ExtraAyuda /> : null} />
        )}
      </div>
    </ContextoVistaPantalla.Provider>
  )
}

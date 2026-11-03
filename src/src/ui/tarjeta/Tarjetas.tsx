/** Tarjeta superior: barra del inicio, título de la ficha y campos de "Cómo llegar" (D1). */
import type { Lugar } from '../../datos/index.ts'
import { useCatalogo, useLugar } from '../catalogo.ts'
import { useAnunciar, usePantalla } from '../estado/contexto.ts'
import {
  IconoCerrar,
  IconoIntercambiar,
  IconoLupa,
  IconoOrigen,
  IconoPin,
  IconoVolver,
} from '../iconos/Iconos.tsx'
import { TEXTOS } from '../textos.ts'
import './tarjetas.css'

export function BarraBusqueda() {
  const { controlador } = usePantalla()
  return (
    <div role="search" className="tarjeta barra">
      {/* Primero el origen y después el destino: la barra abre "Cómo llegar" buscando el origen. */}
      <button
        type="button"
        className="barra__campo"
        aria-label={TEXTOS.barraNombre}
        // Al cerrar la búsqueda del origen, el foco vuelve a ese campo del panel.
        data-foco="campo-origen"
        onClick={controlador.empezarRecorrido}
      >
        <IconoLupa />
        <span className="barra__texto">{TEXTOS.barraPlaceholder}</span>
      </button>
    </div>
  )
}

export function ChipsReferencias() {
  const { despachar } = usePantalla()
  const { referencias } = useCatalogo()
  return (
    <ul className="chips" aria-label={TEXTOS.chipsNombre}>
      {referencias.map((l) => (
        <li key={l.id}>
          <button
            type="button"
            className="chip"
            onClick={() => despachar({ tipo: 'abrir-ficha', lugarId: l.id })}
          >
            {l.nombre}
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          className="chip"
          data-foco="chip-entradas"
          onClick={() =>
            despachar({ tipo: 'abrir-busqueda', campo: 'destino', filtro: 'entradas' })
          }
        >
          {TEXTOS.chipEntradas}
        </button>
      </li>
    </ul>
  )
}

export function TarjetaTitulo({ lugar }: { lugar: Lugar }) {
  const { volver, cerrar } = usePantalla()
  return (
    <div className="tarjeta tarjeta-titulo">
      <button type="button" className="boton-icono" aria-label={TEXTOS.volver} onClick={volver}>
        <IconoVolver />
      </button>
      <p className="tarjeta-titulo__nombre">{lugar.nombre}</p>
      <button type="button" className="boton-icono" aria-label={TEXTOS.cerrar} onClick={cerrar}>
        <IconoCerrar />
      </button>
    </div>
  )
}

export function TarjetaComoLlegar() {
  const { pantalla, despachar, volver } = usePantalla()
  const anunciar = useAnunciar()
  const origen = useLugar(pantalla.seleccion.origen)
  const destino = useLugar(pantalla.seleccion.destino)

  const intercambiar = () => {
    despachar({ tipo: 'intercambiar' })
    anunciar(TEXTOS.intercambiado(destino?.nombre ?? null, origen?.nombre ?? null))
  }

  return (
    <div className="tarjeta como-llegar">
      <button
        type="button"
        className="boton-icono como-llegar__volver"
        aria-label={TEXTOS.volver}
        onClick={volver}
      >
        <IconoVolver />
      </button>
      <div className="como-llegar__campos">
        <div className="campo-con-borrar">
          <button
            type="button"
            className={`campo${origen ? ' campo--con-borrar' : ' campo--vacio'}`}
            aria-label={TEXTOS.campoOrigen(origen?.nombre ?? null)}
            data-foco="campo-origen"
            onClick={() => despachar({ tipo: 'abrir-busqueda', campo: 'origen' })}
          >
            <IconoOrigen tamano={20} />
            <span className="campo__texto">{origen?.nombre ?? TEXTOS.origenVacio}</span>
          </button>
          {origen && (
            <button
              type="button"
              className="boton-icono boton-icono--chico"
              aria-label={TEXTOS.borrarOrigen}
              onClick={() => despachar({ tipo: 'borrar-origen' })}
            >
              <IconoCerrar tamano={20} />
            </button>
          )}
        </div>
        <span className="como-llegar__linea" aria-hidden="true" />
        <div className="campo-con-borrar">
          <button
            type="button"
            className={`campo${destino ? ' campo--con-borrar' : ' campo--vacio'}`}
            aria-label={TEXTOS.campoDestino(destino?.nombre ?? null)}
            data-foco="campo-destino"
            onClick={() => despachar({ tipo: 'abrir-busqueda', campo: 'destino' })}
          >
            <IconoPin tamano={20} />
            <span className="campo__texto">{destino?.nombre ?? TEXTOS.destinoVacio}</span>
          </button>
          {destino && (
            <button
              type="button"
              className="boton-icono boton-icono--chico"
              aria-label={TEXTOS.borrarDestino}
              onClick={() => {
                despachar({ tipo: 'borrar-destino' })
              }}
            >
              <IconoCerrar tamano={20} />
            </button>
          )}
        </div>
      </div>
      <div className="como-llegar__acciones">
        <button
          type="button"
          className="boton-icono"
          aria-label={TEXTOS.intercambiar}
          onClick={intercambiar}
        >
          <IconoIntercambiar />
        </button>
      </div>
    </div>
  )
}

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
import { useVistaPantalla } from '../estado/vistaPantalla.ts'
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
  const { pantalla, despachar, elegirCampoPanel, escribirPanel, campoPanel, consultaPanel } =
    usePantalla()
  const anunciar = useAnunciar()
  const origen = useLugar(pantalla.seleccion.origen)
  const destino = useLugar(pantalla.seleccion.destino)

  const escritorio = useVistaPantalla()?.escritorio ?? false
  // En PC las opciones del campo aparecen en la barra lateral; en celular se abre la búsqueda.
  const tocarCampo = (campo: 'origen' | 'destino') =>
    escritorio
      ? (elegirCampoPanel(campo),
        window.setTimeout(() =>
          document.querySelector<HTMLInputElement>(`input[data-foco="campo-${campo}"]`)?.focus(),
        ))
      : despachar({ tipo: 'abrir-busqueda', campo })

  // PC: el campo tocado (o, si no, el que falta) se vuelve un cuadro de texto.
  const faltante = !origen ? 'origen' : !destino ? 'destino' : null
  const activo = escritorio ? (campoPanel ?? faltante) : null

  const intercambiar = () => {
    despachar({ tipo: 'intercambiar' })
    anunciar(TEXTOS.intercambiado(destino?.nombre ?? null, origen?.nombre ?? null))
  }

  return (
    <div className="tarjeta como-llegar">
      <div className="como-llegar__campos">
        <div className="campo-con-borrar">
          {activo === 'origen' ? (
            <label className="campo campo--escribiendo">
              <IconoOrigen tamano={20} />
              <input
                className="campo__input"
                data-foco="campo-origen"
                placeholder={origen?.nombre ?? TEXTOS.origenVacio}
                aria-label={TEXTOS.campoOrigen(origen?.nombre ?? null)}
                value={consultaPanel}
                onChange={(e) => escribirPanel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') elegirCampoPanel(null)
                }}
              />
            </label>
          ) : (
            <button
              type="button"
              className={`campo${origen ? ' campo--con-borrar' : ' campo--vacio'}`}
              aria-label={TEXTOS.campoOrigen(origen?.nombre ?? null)}
              data-foco="campo-origen"
              onClick={() => tocarCampo('origen')}
            >
              <IconoOrigen tamano={20} />
              <span className="campo__texto">{origen?.nombre ?? TEXTOS.origenVacio}</span>
            </button>
          )}
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
          {activo === 'destino' ? (
            <label className="campo campo--escribiendo">
              <IconoPin tamano={20} />
              <input
                className="campo__input"
                data-foco="campo-destino"
                placeholder={destino?.nombre ?? TEXTOS.destinoVacio}
                aria-label={TEXTOS.campoDestino(destino?.nombre ?? null)}
                value={consultaPanel}
                onChange={(e) => escribirPanel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') elegirCampoPanel(null)
                }}
              />
            </label>
          ) : (
            <button
              type="button"
              className={`campo${destino ? ' campo--con-borrar' : ' campo--vacio'}`}
              aria-label={TEXTOS.campoDestino(destino?.nombre ?? null)}
              data-foco="campo-destino"
              onClick={() => tocarCampo('destino')}
            >
              <IconoPin tamano={20} />
              <span className="campo__texto">{destino?.nombre ?? TEXTOS.destinoVacio}</span>
            </button>
          )}
          {destino && (
            <button
              type="button"
              className="boton-icono boton-icono--chico"
              aria-label={TEXTOS.borrarDestino}
              onClick={() => despachar({ tipo: 'borrar-destino' })}
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

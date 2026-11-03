/** Contenido de la hoja en el panel "Cómo llegar" (design.md, D1 vista 4 y D8). */
import type { Lugar } from '../../datos/index.ts'
import { BotonLugar } from '../busqueda/FilaLugar.tsx'
import { useCatalogo, useLugar } from '../catalogo.ts'
import { usePantalla } from '../estado/contexto.ts'
import { useIntegraciones } from '../integraciones.ts'
import { TEXTOS } from '../textos.ts'
import { ID_TITULO_HOJA } from './ContenidoInicio.tsx'
import type { ContenidoHoja } from './ContenidoInicio.tsx'

export function useContenidoComoLlegar(): ContenidoHoja {
  const { pantalla, fase, despachar } = usePantalla()
  const catalogo = useCatalogo()
  const { estadoAcceso, ContenidoRuta, AvisoClima } = useIntegraciones()
  const { seleccion } = pantalla
  const origen = useLugar(seleccion.origen)
  const destino = useLugar(seleccion.destino)
  const sugerencia = useLugar(seleccion.sugerenciaOrigen)

  // Fase "ruta": el lugar reservado para `mostrar-ruta-e-indicaciones`.
  if (fase === 'ruta' && origen && destino) {
    return {
      cabecera: (
        <>
          <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico">
            {TEXTOS.rutaPedida(origen.nombre, destino.nombre)}
          </h2>
          {AvisoClima && <AvisoClima origen={origen} destino={destino} />}
        </>
      ),
      cuerpo: <ContenidoRuta origen={origen} destino={destino} />,
    }
  }

  const elegirOrigen = (lugar: Lugar) => despachar({ tipo: 'elegir-origen', lugarId: lugar.id })
  const elegirDestino = (lugar: Lugar) => despachar({ tipo: 'elegir-destino', lugarId: lugar.id })
  /** Lista de entradas y referencias: elige el origen o, si ya hay origen, el destino. */
  const listaLugares = (titulo: string, onElegir: (lugar: Lugar) => void) => (
    <section aria-labelledby="hoja-ubicarte" className="hoja-seccion">
      <h3 id="hoja-ubicarte" className="titulo-seccion">
        {titulo}
      </h3>
      <ul className="lista-filas">
        {[...catalogo.entradas, ...catalogo.referencias].map((l) => (
          <BotonLugar
            key={l.id}
            lugar={l}
            tipo="referencia"
            sinAcceso={estadoAcceso(l.id) === 'sin-acceso'}
            onElegir={onElegir}
          />
        ))}
      </ul>
    </section>
  )
  const lugaresParaUbicarte = listaLugares(TEXTOS.lugaresParaUbicarte, elegirOrigen)

  // Origen igual al destino.
  if (origen && destino && origen.id === destino.id) {
    return {
      cabecera: (
        <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico" aria-live="polite">
          {TEXTOS.yaEstas(origen.nombre)}
        </h2>
      ),
      cuerpo: lugaresParaUbicarte,
    }
  }

  if (!origen) {
    return {
      cabecera: (
        <>
          {sugerencia ? (
            <div className="sugerencia">
              <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico">
                {TEXTOS.sugerenciaTitulo(sugerencia.nombre)}
              </h2>
              <p className="ayuda-breve">{TEXTOS.sugerenciaTexto}</p>
              <button
                type="button"
                className="boton boton--secundario"
                onClick={() => despachar({ tipo: 'confirmar-sugerencia' })}
              >
                {TEXTOS.usarOrigen}
              </button>
            </div>
          ) : (
            <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico">
              {TEXTOS.elegiOrigen}
            </h2>
          )}
          <p className="ayuda-breve" data-testid="ayuda-origen">
            {TEXTOS.origenAyuda}
          </p>
        </>
      ),
      cuerpo: lugaresParaUbicarte,
    }
  }

  // Hay origen pero falta el destino: la lista elige el destino.
  return {
    cabecera: (
      <>
        <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico">
          {TEXTOS.elegiDestino}
        </h2>
        <button
          type="button"
          className="boton boton--secundario"
          data-foco="campo-destino"
          onClick={() => despachar({ tipo: 'abrir-busqueda', campo: 'destino' })}
        >
          {TEXTOS.destinoVacio}
        </button>
      </>
    ),
    cuerpo: listaLugares(TEXTOS.referencias, elegirDestino),
  }
}

/** Contenido de la hoja en el panel "Cómo llegar" (design.md, D1 vista 4 y D8). */
import { buscar } from '../../busqueda/index.ts'
import type { Lugar } from '../../datos/index.ts'
import { BotonLugarSinLi } from '../busqueda/FilaLugar.tsx'
import { IconoCerrar } from '../iconos/Iconos.tsx'
import { useCatalogo, useLugar } from '../catalogo.ts'
import { usePantalla } from '../estado/contexto.ts'
import { useIntegraciones } from '../integraciones.ts'
import { TEXTOS } from '../textos.ts'
import { ID_TITULO_HOJA } from './ContenidoInicio.tsx'
import type { ContenidoHoja } from './ContenidoInicio.tsx'

export function useContenidoComoLlegar(): ContenidoHoja {
  const {
    pantalla,
    fase,
    despachar,
    recientes,
    recientesOrigen,
    quitarReciente,
    campoPanel,
    consultaPanel,
  } = usePantalla()
  const catalogo = useCatalogo()
  const { estadoAcceso, ContenidoRuta, AvisoClima } = useIntegraciones()
  const { seleccion } = pantalla
  const origen = useLugar(seleccion.origen)
  const destino = useLugar(seleccion.destino)

  // Fase "ruta": el lugar reservado para `mostrar-ruta-e-indicaciones`.
  if (fase === 'ruta' && origen && destino && !campoPanel) {
    return {
      cabecera: (
        <>
          <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico">
            {TEXTOS.rutaPedida(origen.nombre, destino.nombre)}
          </h2>
          {AvisoClima && <AvisoClima origen={origen} destino={destino} />}
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() => despachar({ tipo: 'limpiar' })}
          >
            {TEXTOS.cancelar}
          </button>
        </>
      ),
      cuerpo: <ContenidoRuta origen={origen} destino={destino} />,
    }
  }

  const elegirOrigen = (lugar: Lugar) => despachar({ tipo: 'elegir-origen', lugarId: lugar.id })
  const elegirDestino = (lugar: Lugar) => despachar({ tipo: 'elegir-destino', lugarId: lugar.id })
  // El campo tocado en la tarjeta o, si no, el que falta.
  const esOrigen = campoPanel ? campoPanel === 'origen' : !origen
  const idsRecientes = esOrigen ? recientesOrigen : recientes

  /** Una sección de la lista, con título y, para los recientes, la cruz para quitarlos. */
  const seccion = (clave: string, titulo: string, lugares: Lugar[], reciente = false) =>
    lugares.length > 0 && (
      <section key={clave} aria-labelledby={`hoja-${clave}`} className="hoja-seccion">
        <h3 id={`hoja-${clave}`} className="titulo-seccion">
          {titulo}
        </h3>
        <ul className="lista-filas">
          {lugares.map((l) => (
            <li key={l.id} className="fila-con-quitar">
              <BotonLugarSinLi
                lugar={l}
                tipo={reciente ? 'reciente' : 'referencia'}
                sinAcceso={estadoAcceso(l.id) === 'sin-acceso'}
                onElegir={esOrigen ? elegirOrigen : elegirDestino}
              />
              {reciente && (
                <button
                  type="button"
                  className="boton-icono boton-icono--chico fila__quitar"
                  aria-label={TEXTOS.quitarReciente(l.nombre)}
                  onClick={() => quitarReciente(esOrigen ? 'origen' : 'destino', l.id)}
                >
                  <IconoCerrar tamano={20} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    )
  const lugaresRecientes = idsRecientes
    .map((id) => catalogo.porId.get(id))
    .filter((l): l is Lugar => !!l)
  const texto = consultaPanel.trim()
  const resultados = texto ? buscar(catalogo.indice, texto).map((r) => r.lugar) : []
  const lista = texto ? (
    seccion('resultados', TEXTOS.resultados(resultados.length), resultados) || (
      <p className="ayuda-breve">{TEXTOS.sinResultados(texto)}</p>
    )
  ) : (
    <>
      {seccion('recientes', TEXTOS.recientes, lugaresRecientes, true)}
      {esOrigen && seccion('entradas', TEXTOS.entradasAlCampus, catalogo.entradas)}
      {seccion('referencias', TEXTOS.referencias, catalogo.referencias)}
    </>
  )

  // Origen igual al destino.
  if (origen && destino && origen.id === destino.id) {
    return {
      cabecera: (
        <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico" aria-live="polite">
          {TEXTOS.yaEstas(origen.nombre)}
        </h2>
      ),
      cuerpo: lista,
    }
  }

  return {
    cabecera: (
      <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico">
        {esOrigen ? TEXTOS.elegiOrigen : TEXTOS.elegiDestino}
      </h2>
    ),
    cuerpo: lista,
  }
}

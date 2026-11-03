/** Contenido de la hoja en el inicio: indicación de primer uso o recientes y referencias. */
import type { ReactNode } from 'react'
import type { Lugar } from '../../datos/index.ts'
import { BotonLugar } from '../busqueda/FilaLugar.tsx'
import { useCatalogo } from '../catalogo.ts'
import { usePantalla } from '../estado/contexto.ts'
import { useIntegraciones } from '../integraciones.ts'
import { TEXTOS } from '../textos.ts'

export const ID_TITULO_HOJA = 'hoja-titulo'

export interface ContenidoHoja {
  cabecera: ReactNode
  cuerpo: ReactNode
}

/** `true` si el inicio tiene que mostrar la indicación de primer uso. */
export function useMostrarPrimerUso(): boolean {
  const { recientes, primerUsoCerrado } = usePantalla()
  return recientes.length === 0 && !primerUsoCerrado
}

export function useContenidoInicio(): ContenidoHoja {
  const { recientes, despachar, cerrarPrimerUso } = usePantalla()
  const catalogo = useCatalogo()
  const { estadoAcceso } = useIntegraciones()
  const primerUso = useMostrarPrimerUso()

  const abrir = (lugar: Lugar) => despachar({ tipo: 'abrir-ficha', lugarId: lugar.id })
  const fila = (lugar: Lugar, tipo: 'reciente' | 'referencia') => (
    <BotonLugar
      key={`${tipo}-${lugar.id}`}
      lugar={lugar}
      tipo={tipo}
      sinAcceso={estadoAcceso(lugar.id) === 'sin-acceso'}
      onElegir={abrir}
    />
  )
  const referencias = (
    <section aria-labelledby="hoja-referencias" className="hoja-seccion">
      <h3 id="hoja-referencias" className="titulo-seccion">
        {TEXTOS.referencias}
      </h3>
      <ul className="lista-filas">
        {[...catalogo.referencias, ...catalogo.entradas].map((l) => fila(l, 'referencia'))}
      </ul>
    </section>
  )

  if (primerUso) {
    return {
      cabecera: (
        <h2 id={ID_TITULO_HOJA} className="titulo-hoja">
          {TEXTOS.primerUsoTitulo}
        </h2>
      ),
      cuerpo: (
        <>
          <div className="primer-uso">
            <p>{TEXTOS.primerUso}</p>
            <button type="button" className="boton boton--primario" onClick={cerrarPrimerUso}>
              {TEXTOS.entendido}
            </button>
          </div>
          {referencias}
        </>
      ),
    }
  }

  const lugares = recientes.map((id) => catalogo.porId.get(id)).filter((l): l is Lugar => !!l)
  if (lugares.length === 0) {
    return {
      cabecera: (
        <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico">
          {TEXTOS.referencias}
        </h2>
      ),
      cuerpo: (
        <ul className="lista-filas">
          {[...catalogo.referencias, ...catalogo.entradas].map((l) => fila(l, 'referencia'))}
        </ul>
      ),
    }
  }

  const [primero, ...resto] = lugares
  return {
    cabecera: (
      <>
        <h2 id={ID_TITULO_HOJA} className="titulo-hoja titulo-hoja--chico">
          {TEXTOS.recientes}
        </h2>
        <ul className="lista-filas">{primero && fila(primero, 'reciente')}</ul>
      </>
    ),
    cuerpo: (
      <>
        {resto.length > 0 && (
          <ul className="lista-filas">{resto.map((l) => fila(l, 'reciente'))}</ul>
        )}
        {referencias}
      </>
    ),
  }
}

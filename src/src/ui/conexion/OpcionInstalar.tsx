/**
 * Opción de instalar para la ayuda (decisión 8): en Chrome para Android, el botón
 * "Instalar en el celular"; en Safari para iOS, los pasos "Compartir → Agregar a inicio".
 * Instalada o sin forma de instalar, no muestra nada.
 */
import type { Plataforma } from './instalacion.ts'
import { TEXTOS_CONEXION as T } from './textos.ts'
import './conexion.css'

/** Título de los pasos de iOS (el botón flotante baja hasta acá). */
export const ID_PASOS_IOS = 'instalar-ios-titulo'

export interface PropsOpcionInstalar {
  plataforma: Plataforma
  puedeInstalar: boolean
  onInstalar: () => void
}

export default function OpcionInstalar({
  plataforma,
  puedeInstalar,
  onInstalar,
}: PropsOpcionInstalar) {
  if (plataforma === 'instalada') return null
  if (plataforma === 'ios') {
    return (
      <section className="instalar" aria-labelledby={ID_PASOS_IOS}>
        <h3 id={ID_PASOS_IOS} className="instalar__titulo">
          {T.pasosIosTitulo}
        </h3>
        <ol className="instalar__pasos">
          {T.pasosIos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </section>
    )
  }
  if (!puedeInstalar) return null
  return (
    <button type="button" className="boton boton--secundario instalar__boton" onClick={onInstalar}>
      {T.instalar}
    </button>
  )
}

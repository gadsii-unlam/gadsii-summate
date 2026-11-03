/**
 * `Integraciones.BotonInstalar` de la app: botón flotante "Instalar app", arriba del de ayuda.
 * En Chrome abre el diálogo del sistema; en Safari para iOS abre la ayuda en los pasos
 * "Compartir → Agregar a inicio". Instalada, sin forma de instalar o con una ruta en pantalla
 * no se muestra (decisión 8). En el primer uso no lo monta la pantalla.
 */
import { usePantalla } from '../estado/contexto.ts'
import { IconoInstalar } from '../iconos/Iconos.tsx'
import { useValorConexion } from './contexto.ts'
import { ID_PASOS_IOS } from './OpcionInstalar.tsx'
import { TEXTOS_CONEXION as T } from './textos.ts'

export default function BotonInstalar() {
  const valor = useValorConexion()
  const { despachar } = usePantalla()
  if (!valor || valor.hayRutaEnPantalla) return null
  const { plataforma, puedeInstalar, instalar } = valor.instalacion
  if (plataforma === 'instalada') return null
  if (plataforma === 'otra' && !puedeInstalar) return null

  const alTocar = () => {
    if (puedeInstalar) {
      void instalar()
      return
    }
    despachar({ tipo: 'abrir-ayuda' })
    // Después del foco inicial de la ayuda (en su título), bajar hasta los pasos de iOS.
    window.setTimeout(() => document.getElementById(ID_PASOS_IOS)?.scrollIntoView?.(), 0)
  }

  return (
    <button
      type="button"
      className="boton-circular"
      aria-label={T.instalarApp}
      data-foco="instalar"
      onClick={alTocar}
    >
      <IconoInstalar />
    </button>
  )
}

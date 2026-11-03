/**
 * `Integraciones.ContenidoRuta` de la app: conecta `ResultadoRuta` con el orquestador de
 * `adaptar-ruta-al-clima`, los cierres (aviso de desvío y "Sin ruta disponible"), la capa del mapa
 * (por `VistaRuta`).
 */
import { useEffect, useMemo } from 'react'
import { avisoDeDesvio, explicarSinRuta, type AccionSinRuta } from '../../cierres/index.ts'
import type { Criterio } from '../../rutas/index.ts'
import { useEstadoCierresActual } from '../cierres/contexto.ts'
import { useEstadoRutaDe } from '../clima/contexto.ts'
import { usePantalla } from '../estado/contexto.ts'
import type { PropsContenidoRuta } from '../integraciones.ts'
import { useDatosIndicaciones, useEstadoVistaRuta, useVistaRuta } from './conexion.ts'
import EsperaRuta from './EsperaRuta.tsx'
import ResultadoRuta from './ResultadoRuta.tsx'
import SinRutaDisponible from './SinRutaDisponible.tsx'

const SIN_CIERRES = [] as const

export default function ContenidoRutaApp({ origen, destino }: PropsContenidoRuta) {
  const estado = useEstadoRutaDe(origen.id, destino.id)
  const datos = useDatosIndicaciones()
  const vista = useVistaRuta()
  const estadoVista = useEstadoVistaRuta()
  const cierres = useEstadoCierresActual()
  const { despachar, cerrar } = usePantalla()
  const clave = `${origen.id}|${destino.id}`

  // Al salir de la vista de ruta (otro origen o destino, Atrás, Finalizar) el mapa queda sin ruta.
  useEffect(() => () => vista?.limpiar(clave), [vista, clave])

  const plan = estado.tipo === 'listo' ? estado.plan : null
  const vigentes = cierres?.vigentes ?? SIN_CIERRES

  // "Sin ruta disponible" con el motivo (sin volver a rutear: es una búsqueda en la zona).
  const sinRuta = useMemo(() => {
    const principal = plan?.principal
    if (!datos || principal?.tipo !== 'sin-ruta') return null
    return explicarSinRuta(
      datos.grafo,
      {
        origen: origen.puertas,
        destino: destino.puertas,
        criterio: 'mas-corta',
        nombreOrigen: origen.nombre,
        nombreDestino: destino.nombre,
      },
      vigentes,
      principal.motivo,
    )
  }, [plan, datos, origen, destino, vigentes])

  // Aviso de desvío: una ruta sin exclusiones por criterio mostrado, solo si hay cierres vigentes.
  const desvios = useMemo(() => {
    const textos = new Map<Criterio, string | null>()
    if (!datos || !plan || vigentes.length === 0) return textos
    for (const r of [plan.principal, plan.alternativa]) {
      if (r?.tipo !== 'ruta' || textos.has(r.criterio)) continue
      const aviso = avisoDeDesvio(
        datos.grafo,
        { origen: origen.puertas, destino: destino.puertas, criterio: r.criterio },
        vigentes,
      )
      textos.set(r.criterio, aviso?.texto ?? null)
    }
    return textos
  }, [plan, datos, origen, destino, vigentes])

  const accion = (id: AccionSinRuta['id']) => {
    if (id === 'elegir-otro-destino') despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    else cerrar()
  }

  let cuerpo
  if (sinRuta) {
    cuerpo = <SinRutaDisponible sinRuta={sinRuta} alAccion={accion} />
  } else if (!datos) {
    cuerpo = <EsperaRuta origen={origen.nombre} destino={destino.nombre} />
  } else {
    cuerpo = (
      <ResultadoRuta
        origen={origen}
        destino={destino}
        estado={estado}
        elegida={
          estadoVista.plan === plan && estadoVista.clave === clave ? estadoVista.criterio : null
        }
        alElegir={(c) => plan && vista?.elegir(plan, c)}
        alCambiarSeleccion={(s) => vista?.mostrar(clave, plan, s)}
        alIniciar={() => vista?.iniciar()}
        alFinalizar={() => {
          vista?.limpiar()
          cerrar()
        }}
        avisoDe={(s) => desvios.get(s.criterio) ?? null}
      />
    )
  }

  return (
    <div className="contenido-ruta" data-testid="contenido-ruta">
      {cuerpo}
    </div>
  )
}

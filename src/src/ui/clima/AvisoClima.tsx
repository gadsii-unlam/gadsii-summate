import type { Criterio } from '../../rutas/index.ts'
import {
  PREGUNTA_CLIMA_NO_DISPONIBLE,
  textoEstadoClima,
  type PlanDeRuta,
} from '../../clima/index.ts'
import type { PropsContenidoRuta } from '../integraciones.ts'
import { TEXTOS } from '../textos.ts'
import { useEstadoRutaDe, useOrquestadorRuta } from './contexto.ts'
import './AvisoClima.css'

/**
 * Línea del clima arriba del resultado (`Integraciones.AvisoClima`). Con el clima caído y dos
 * rutas distintas ofrece las dos opciones con su comparación, sin preseleccionar ninguna, y
 * "Reintentar". Los chips de alternativas con lluvia y la tarjeta son de `mostrar-ruta-e-indicaciones`.
 */
export default function AvisoClima({ origen, destino }: PropsContenidoRuta) {
  const estado = useEstadoRutaDe(origen.id, destino.id)
  const orquestador = useOrquestadorRuta()
  if (estado.tipo !== 'listo' || !orquestador) return null
  const { plan, actualizando } = estado

  if (plan.estadoClima !== 'no-disponible') {
    return (
      <p className="aviso-clima" role="status" data-estado-clima={plan.estadoClima}>
        {textoEstadoClima(plan)}
      </p>
    )
  }

  return (
    <div
      className="aviso-clima aviso-clima--falla"
      data-estado-clima="no-disponible"
      aria-busy={actualizando}
    >
      <p role="status">
        {plan.requiereEleccion ? PREGUNTA_CLIMA_NO_DISPONIBLE : textoEstadoClima(plan)}
      </p>
      {plan.notaRutaUnica && <p className="aviso-clima__nota">{plan.notaRutaUnica}</p>}
      {plan.comparacion && (
        <OpcionesCriterio plan={plan} onElegir={(c) => orquestador.elegirCriterio(c)} />
      )}
      <button
        type="button"
        className="boton aviso-clima__reintentar"
        disabled={actualizando}
        onClick={() => void orquestador.reintentar()}
      >
        {TEXTOS.reintentar}
      </button>
    </div>
  )
}

function OpcionesCriterio({
  plan,
  onElegir,
}: {
  plan: PlanDeRuta
  onElegir: (criterio: Criterio) => void
}) {
  const c = plan.comparacion
  if (!c) return null
  const opciones = [
    {
      criterio: 'resguardada' as const,
      nombre: c.resguardada.etiqueta,
      detalle: `${c.resguardada.tiempoMin} min · ${c.resguardada.textoAireLibre}`,
      diferencia: c.diferencia.texto,
    },
    {
      criterio: 'mas-corta' as const,
      nombre: c.masRapida.etiqueta,
      detalle: `${c.masRapida.tiempoMin} min · ${c.masRapida.textoAireLibre}`,
      diferencia: null,
    },
  ]
  return (
    <div className="aviso-clima__opciones" role="group" aria-label="¿Cómo querés ir?">
      {opciones.map((o) => (
        <button
          key={o.criterio}
          type="button"
          className="aviso-clima__opcion"
          aria-pressed={plan.criterioPrincipal === o.criterio}
          onClick={() => onElegir(o.criterio)}
        >
          <span className="aviso-clima__nombre">{o.nombre}</span>
          <span className="aviso-clima__detalle">{o.detalle}</span>
          {o.diferencia && <span className="aviso-clima__detalle">{o.diferencia}</span>}
        </button>
      ))}
    </div>
  )
}

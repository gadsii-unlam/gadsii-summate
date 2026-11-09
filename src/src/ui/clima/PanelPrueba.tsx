import { useEffect, useId, useSyncExternalStore } from 'react'
import { ESCENARIOS_CLIMA, type ControlEscenario } from '../../clima/index.ts'
import { NOMBRES_ESCENARIO } from './nombres.ts'
import './PanelPrueba.css'

export interface PropsPanelPrueba {
  /** Escenario de la sesión (`crearClimaDeLaApp().control`). */
  control: ControlEscenario
  abierto: boolean
  onCerrar: () => void
  /**
   * Etiqueta de la fecha simulada de `aplicar-cierres-temporales` (por ejemplo "05/11 10:00"), o
   * `null`/ausente si no está activa.
   */
  fechaSimulada?: string | null
}

/**
 * Panel de prueba oculto (design.md de adaptar-ruta-al-clima, D3): control del prototipo para el
 * moderador, no parte de la interfaz del usuario. Elegir un escenario lo guarda en la sesión y
 * avisa a los suscriptores del control (que recalculan la ruta en pantalla).
 */
export default function PanelPrueba({
  control,
  abierto,
  onCerrar,
  fechaSimulada,
}: PropsPanelPrueba) {
  const activo = useSyncExternalStore(control.suscribir, control.actual, control.actual)
  const idTitulo = useId()

  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div className="panel-prueba">
      <button
        type="button"
        className="panel-prueba__velo"
        aria-label="Cerrar panel de prueba"
        tabIndex={-1}
        onClick={onCerrar}
      />
      <section
        className="panel-prueba__hoja"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        <h2 id={idTitulo} className="panel-prueba__titulo">
          Panel de prueba
        </h2>
        <fieldset className="panel-prueba__grupo">
          <legend>Clima simulado</legend>
          {ESCENARIOS_CLIMA.map((escenario) => (
            <label key={escenario} className="panel-prueba__opcion">
              <input
                type="radio"
                name="escenario-clima"
                value={escenario}
                checked={activo === escenario}
                onChange={() => control.elegir(escenario)}
              />
              {NOMBRES_ESCENARIO[escenario]}
            </label>
          ))}
        </fieldset>
        <p className="panel-prueba__dato">
          Escenario activo: <strong>{NOMBRES_ESCENARIO[activo]}</strong>
        </p>
        {fechaSimulada ? (
          <p className="panel-prueba__dato">
            Fecha simulada: <strong>{fechaSimulada}</strong>
          </p>
        ) : null}
        <button type="button" className="panel-prueba__cerrar" onClick={onCerrar}>
          Cerrar
        </button>
      </section>
    </div>
  )
}

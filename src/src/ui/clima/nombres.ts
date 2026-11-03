import type { EscenarioClima } from '../../clima/index.ts'

/** Nombres de los escenarios en el panel de prueba (solo los ve el moderador). */
export const NOMBRES_ESCENARIO: Record<EscenarioClima, string> = {
  seco: 'Seco',
  lluvia: 'Lluvia',
  error: 'Error',
  lento: 'Lento',
}

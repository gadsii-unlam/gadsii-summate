/**
 * Lugar reservado para el resultado de la ruta. `mostrar-ruta-e-indicaciones` lo reemplaza con
 * `Integraciones.ContenidoRuta` (tarjeta "4 min · 280 m", alternativas, pasos).
 */
import { TEXTOS } from '../textos.ts'

export default function ContenidoRutaProvisional() {
  return (
    <div className="contenido-ruta" data-testid="contenido-ruta">
      <p role="status">{TEXTOS.buscandoCamino}</p>
    </div>
  )
}

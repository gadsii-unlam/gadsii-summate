import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { capaDeCierres, cierresVigentes, parsearFecha } from '../../cierres/index.ts'
import { cierresEjemplo, grafoReal } from '../../cierres/test/datos.ts'
import { estadoAccesoDe } from './acceso.ts'
import DetalleCierre from './DetalleCierre.tsx'

const ZONA = 'America/Argentina/Buenos_Aires'

describe('DetalleCierre', () => {
  it('muestra el motivo y "Cerrado hasta el 14/11 a las 23:00" para la obra de ejemplo', () => {
    const vigentes = cierresVigentes(cierresEjemplo(), parsearFecha('2026-11-05T10:00-03:00')!)
    const [obra] = capaDeCierres(grafoReal(), vigentes)
    render(<DetalleCierre tramo={obra!} zonaHoraria={ZONA} />)
    expect(screen.getByText('Obra en la entrada oeste del Edificio Sur')).toBeInTheDocument()
    expect(screen.getByText('Cerrado hasta el 14/11 a las 23:00')).toBeInTheDocument()
  })

  it('sin fecha de fin solo muestra el motivo', () => {
    render(<DetalleCierre tramo={{ motivo: 'Vereda en reparación', hasta: null }} />)
    expect(screen.getByText('Vereda en reparación')).toBeInTheDocument()
    expect(screen.queryByText(/Cerrado hasta/)).toBeNull()
  })
})

describe('estadoAccesoDe', () => {
  it('traduce el estado de cierres al contrato de la interfaz', () => {
    const acceso = estadoAccesoDe({
      ahora: 0,
      vigentes: [],
      excluidos: { nodos: new Set(), aristas: new Set() },
      sinAcceso: new Set(['lab-quimica']),
      capa: [],
    })
    expect(acceso('lab-quimica')).toBe('sin-acceso')
    expect(acceso('aula-121')).toBe('accesible')
    expect(estadoAccesoDe(null)('lab-quimica')).toBe('accesible')
  })
})

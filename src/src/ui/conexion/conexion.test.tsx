import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearMonitorConexion, type VentanaConexion } from '../../conexion/index.ts'
import { AvisoCambiosRuta, AvisoRutaActualizada } from './AvisoCambiosRuta.tsx'
import AvisoCierresSinActualizar from './AvisoCierresSinActualizar.tsx'
import AvisoVersionNueva from './AvisoVersionNueva.tsx'
import BarraSinConexion from './BarraSinConexion.tsx'
import {
  CLAVE_INSTALACION,
  contarRecorridoTerminado,
  debeSugerirInstalacion,
  detectarPlataforma,
  leerRegistro,
  marcarSugerenciaMostrada,
  pedirAlmacenamientoPersistente,
} from './instalacion.ts'
import OpcionInstalar from './OpcionInstalar.tsx'
import { ALTO_BARRA, posicionBarra, SEPARACION_BARRA } from './posicion.ts'
import SugerenciaInstalacion from './SugerenciaInstalacion.tsx'
import { useConexion } from './useConexion.ts'
import { useInstalacion } from './useInstalacion.ts'

const AR = 'America/Argentina/Buenos_Aires'
const MEDIDAS = { altoVentana: 844, altoHoja: 300, bordeTarjeta: 160 }

describe('BarraSinConexion', () => {
  it('muestra "Sin conexión" con role="status" y "Reintentar"', async () => {
    const onReintentar = vi.fn()
    render(
      <BarraSinConexion
        visible
        reintentando={false}
        onReintentar={onReintentar}
        medidas={MEDIDAS}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onReintentar).toHaveBeenCalledTimes(1)
  })

  it('mientras reintenta, el botón muestra el indicador y no se puede tocar', async () => {
    const onReintentar = vi.fn()
    render(<BarraSinConexion visible reintentando onReintentar={onReintentar} medidas={MEDIDAS} />)
    const boton = screen.getByRole('button', { name: 'Reintentando…' })
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(boton)
    expect(onReintentar).not.toHaveBeenCalled()
  })

  it('no se muestra con conexión', () => {
    const { container } = render(
      <BarraSinConexion
        visible={false}
        reintentando={false}
        onReintentar={() => {}}
        medidas={MEDIDAS}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('con cierres de la copia guardada agrega la hora', () => {
    render(
      <BarraSinConexion
        visible
        reintentando={false}
        onReintentar={() => {}}
        medidas={MEDIDAS}
        origenCierres={{ origen: 'cache', guardadoEn: '2026-10-22T16:40:00.000Z' }}
        zonaHoraria={AR}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Cierres sin actualizar desde las 13:40')
  })

  it('se ubica arriba de la hoja (variable --aviso-abajo)', () => {
    render(
      <BarraSinConexion visible reintentando={false} onReintentar={() => {}} medidas={MEDIDAS} />,
    )
    const barra = screen.getByRole('status').parentElement as HTMLElement
    expect(barra.style.getPropertyValue('--aviso-abajo')).toBe(`${300 + SEPARACION_BARRA}px`)
  })

  it('sigue el estado del monitor de conexión', () => {
    const ventana: VentanaConexion = {
      addEventListener: () => {},
      removeEventListener: () => {},
      navigator: { onLine: true },
    }
    const monitor = crearMonitorConexion({ ventana })
    function Prueba() {
      const estado = useConexion(monitor)
      return (
        <BarraSinConexion
          visible={estado === 'sin-conexion'}
          reintentando={false}
          onReintentar={() => {}}
          medidas={MEDIDAS}
        />
      )
    }
    render(<Prueba />)
    expect(screen.queryByText('Sin conexión')).toBeNull()
    act(() => monitor.reportarFalla(new TypeError('Failed to fetch')))
    expect(screen.getByText('Sin conexión')).toBeVisible()
    act(() => monitor.reportarRespuesta({ headers: new Headers() }))
    expect(screen.queryByText('Sin conexión')).toBeNull()
  })
})

describe('posicionBarra a 390 × 844', () => {
  // Rectángulos en px desde arriba: [arriba, abajo).
  const rect = (abajoDesdeAbajo: number, alto: number) => [
    844 - abajoDesdeAbajo - alto,
    844 - abajoDesdeAbajo,
  ]
  const seSolapan = (a: number[], b: number[]) =>
    (a[0] ?? 0) < (b[1] ?? 0) && (b[0] ?? 0) < (a[1] ?? 0)

  it.each([
    ['hoja colapsada con el panel "Cómo llegar"', 132, 176],
    ['hoja media con la tarjeta resumen de la ruta', 422, 176],
    ['hoja media con la barra de búsqueda', 422, 72],
  ])('%s: no tapa la tarjeta ni la hoja', (_, altoHoja, bordeTarjeta) => {
    const p = posicionBarra({ altoVentana: 844, altoHoja, bordeTarjeta })
    expect(p.sobreLaHoja).toBe(false)
    const barra = rect(p.abajo, ALTO_BARRA)
    expect(seSolapan(barra, [0, bordeTarjeta])).toBe(false)
    expect(seSolapan(barra, [844 - altoHoja, 844])).toBe(false)
  })

  it('con la hoja expandida no tapa la tarjeta de arriba', () => {
    const p = posicionBarra({ altoVentana: 844, altoHoja: 700, bordeTarjeta: 176 })
    expect(p.sobreLaHoja).toBe(true)
    const barra = rect(p.abajo, ALTO_BARRA)
    expect(seSolapan(barra, [0, 176])).toBe(false)
  })
})

describe('AvisoCierresSinActualizar (4.5)', () => {
  it('con la copia muestra la hora', () => {
    render(
      <AvisoCierresSinActualizar
        origen={{ origen: 'respaldo', guardadoEn: '2026-10-22T16:40:00.000Z' }}
        zonaHoraria={AR}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Cierres sin actualizar desde las 13:40')
  })

  it('con cierres de la red no aparece', () => {
    const { container } = render(<AvisoCierresSinActualizar origen={{ origen: 'red' }} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('avisos de cambios de ruta', () => {
  it('tramo cerrado y cambios ofrecen "Ver ruta actualizada"', async () => {
    const onVerRuta = vi.fn()
    const { rerender } = render(<AvisoCambiosRuta cambio="tramo-cerrado" onVerRuta={onVerRuta} />)
    expect(screen.getByRole('status')).toHaveTextContent('Un tramo de tu ruta está cerrado')
    await userEvent.click(screen.getByRole('button', { name: 'Ver ruta actualizada' }))
    expect(onVerRuta).toHaveBeenCalledTimes(1)
    rerender(<AvisoCambiosRuta cambio="cambios" onVerRuta={onVerRuta} />)
    expect(screen.getByRole('status')).toHaveTextContent('Hay cambios en tu ruta')
    rerender(<AvisoCambiosRuta cambio="igual" onVerRuta={onVerRuta} />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('ruta actualizada después de reintentar', () => {
    render(<AvisoRutaActualizada visible />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Actualizamos la ruta con los datos nuevos',
    )
  })
})

describe('AvisoVersionNueva', () => {
  it('con una ruta en pantalla no aparece; después de "Finalizar viaje", sí', () => {
    const { rerender } = render(
      <AvisoVersionNueva hayVersionNueva recorridoEnPantalla onActualizar={() => {}} />,
    )
    expect(screen.queryByText('Hay una versión nueva')).toBeNull()
    rerender(
      <AvisoVersionNueva hayVersionNueva recorridoEnPantalla={false} onActualizar={() => {}} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Hay una versión nueva')
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeVisible()
  })

  it('"Actualizar" activa la versión; "Más tarde" la cierra', async () => {
    const onActualizar = vi.fn()
    const onMasTarde = vi.fn()
    const { unmount } = render(
      <AvisoVersionNueva
        hayVersionNueva
        recorridoEnPantalla={false}
        onActualizar={onActualizar}
        onMasTarde={onMasTarde}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(onActualizar).toHaveBeenCalledTimes(1)
    unmount()
    render(
      <AvisoVersionNueva
        hayVersionNueva
        recorridoEnPantalla={false}
        onActualizar={onActualizar}
        onMasTarde={onMasTarde}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Más tarde' }))
    expect(onMasTarde).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Hay una versión nueva')).toBeNull()
  })

  it('sin versión nueva no aparece', () => {
    const { container } = render(
      <AvisoVersionNueva
        hayVersionNueva={false}
        recorridoEnPantalla={false}
        onActualizar={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

const UA_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

describe('instalación', () => {
  it('detecta Safari para iOS, iPadOS, Android e instalada', () => {
    expect(detectarPlataforma({ userAgent: UA_IOS })).toBe('ios')
    expect(
      detectarPlataforma({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        maxTouchPoints: 5,
      }),
    ).toBe('ios')
    expect(detectarPlataforma({ userAgent: UA_ANDROID })).toBe('otra')
    expect(detectarPlataforma({ userAgent: UA_IOS, standalone: true })).toBe('instalada')
    expect(detectarPlataforma({ userAgent: UA_ANDROID, modoStandalone: true })).toBe('instalada')
  })

  it('en Safari para iOS la ayuda muestra los pasos Compartir → Agregar a inicio', () => {
    render(
      <OpcionInstalar
        plataforma={detectarPlataforma({ userAgent: UA_IOS })}
        puedeInstalar={false}
        onInstalar={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Agregar a la pantalla de inicio' })).toBeVisible()
    const pasos = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(pasos[0]).toMatch(/Compartir/)
    expect(pasos[1]).toMatch(/Agregar a inicio/)
    expect(screen.queryByRole('button', { name: 'Instalar en el celular' })).toBeNull()
  })

  it('en Chrome para Android con el evento, "Instalar en el celular"', async () => {
    const onInstalar = vi.fn()
    render(<OpcionInstalar plataforma="otra" puedeInstalar onInstalar={onInstalar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Instalar en el celular' }))
    expect(onInstalar).toHaveBeenCalledTimes(1)
  })

  it('instalada o sin evento, nada', () => {
    const a = render(<OpcionInstalar plataforma="instalada" puedeInstalar onInstalar={() => {}} />)
    expect(a.container).toBeEmptyDOMElement()
    a.unmount()
    const b = render(
      <OpcionInstalar plataforma="otra" puedeInstalar={false} onInstalar={() => {}} />,
    )
    expect(b.container).toBeEmptyDOMElement()
  })
})

describe('sugerencia de instalación', () => {
  beforeEach(() => localStorage.clear())

  const condiciones = (hayRutaEnPantalla = false) => ({
    puedeInstalar: true,
    hayRutaEnPantalla,
    registro: leerRegistro(),
  })

  it('primer uso: no aparece', () => {
    expect(debeSugerirInstalacion(condiciones())).toBe(false)
    const { container } = render(
      <SugerenciaInstalacion
        visible={debeSugerirInstalacion(condiciones())}
        onInstalar={() => {}}
        onCerrar={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('con una ruta en pantalla: no aparece, aunque ya haya dos recorridos', () => {
    contarRecorridoTerminado()
    contarRecorridoTerminado()
    expect(debeSugerirInstalacion(condiciones(true))).toBe(false)
  })

  it('después del segundo recorrido terminado: aparece una sola vez', async () => {
    contarRecorridoTerminado()
    expect(debeSugerirInstalacion(condiciones())).toBe(false)
    contarRecorridoTerminado()
    expect(debeSugerirInstalacion(condiciones())).toBe(true)
    const onCerrar = vi.fn(() => marcarSugerenciaMostrada())
    render(<SugerenciaInstalacion visible onInstalar={() => {}} onCerrar={onCerrar} />)
    expect(screen.getByRole('region', { name: 'Instalar en el celular' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(debeSugerirInstalacion(condiciones())).toBe(false)
    contarRecorridoTerminado()
    expect(debeSugerirInstalacion(condiciones())).toBe(false)
    expect(JSON.parse(localStorage.getItem(CLAVE_INSTALACION) ?? '{}')).toMatchObject({
      recorridosTerminados: 3,
      sugerenciaMostrada: true,
    })
  })

  it('sin Chrome ofreciendo instalar no aparece', () => {
    contarRecorridoTerminado()
    contarRecorridoTerminado()
    expect(debeSugerirInstalacion({ ...condiciones(), puedeInstalar: false })).toBe(false)
  })

  it('con almacenamiento que lanza no rompe', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    }
    expect(leerRegistro(roto)).toEqual({ recorridosTerminados: 0, sugerenciaMostrada: false })
    expect(() => contarRecorridoTerminado(roto)).not.toThrow()
  })
})

describe('useInstalacion', () => {
  afterEach(() => vi.restoreAllMocks())

  it('guarda beforeinstallprompt y abre el diálogo del sistema', async () => {
    const { result } = renderHook(() => useInstalacion())
    expect(result.current.puedeInstalar).toBe(false)
    const prompt = vi.fn(() => Promise.resolve())
    const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    act(() => {
      window.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    expect(result.current.puedeInstalar).toBe(true)
    let aceptado = false
    await act(async () => {
      aceptado = await result.current.instalar()
    })
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(aceptado).toBe(true)
    expect(result.current.puedeInstalar).toBe(false)
  })

  it('al instalarse pide almacenamiento persistente', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist, persisted: () => Promise.resolve(false) },
    })
    const { result } = renderHook(() => useInstalacion())
    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.plataforma).toBe('instalada')
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('pedirAlmacenamientoPersistente nunca rechaza', async () => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
    expect(await pedirAlmacenamientoPersistente()).toBe(false)
    expect(
      await pedirAlmacenamientoPersistente({
        persist: () => Promise.reject(new Error('x')),
        persisted: () => Promise.resolve(false),
      }),
    ).toBe(false)
  })
})

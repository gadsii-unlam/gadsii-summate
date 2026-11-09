import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const estado = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(() => Promise.resolve()),
  opciones: null as null | { onRegisteredSW?: (url: string, r?: unknown) => void },
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (opciones: { onRegisteredSW?: (url: string, r?: unknown) => void }) => {
    estado.opciones = opciones
    return {
      needRefresh: [estado.needRefresh, estado.setNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: estado.updateServiceWorker,
    }
  },
}))

const { INTERVALO_BUSQUEDA_MS, useVersionNueva } = await import('./useVersionNueva.ts')

describe('useVersionNueva (registro simulado)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('busca actualizaciones cada 60 minutos y con el evento online', () => {
    const update = vi.fn(() => Promise.resolve())
    renderHook(() => useVersionNueva())
    act(() => estado.opciones?.onRegisteredSW?.('/sw.js', { update, installing: null }))
    expect(update).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(INTERVALO_BUSQUEDA_MS))
    expect(update).toHaveBeenCalledTimes(1)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('expone la versión en espera y "Actualizar" la activa', () => {
    estado.needRefresh = true
    const { result } = renderHook(() => useVersionNueva())
    expect(result.current.hayVersionNueva).toBe(true)
    result.current.actualizar()
    expect(estado.updateServiceWorker).toHaveBeenCalledWith(true)
    result.current.postergar()
    expect(estado.setNeedRefresh).toHaveBeenCalledWith(false)
    estado.needRefresh = false
  })
})

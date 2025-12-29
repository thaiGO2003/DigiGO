export function setupAntiDebug() {
  if (typeof window === 'undefined') return
  if (!(import.meta as any).env?.PROD) return
  const handlerKey = (e: KeyboardEvent) => {
    const isF12 = e.key === 'F12'
    const isCtrlShiftI = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i'
    const isCtrlShiftJ = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j'
    const isCtrlU = e.ctrlKey && e.key.toLowerCase() === 'u'
    if (isF12 || isCtrlShiftI || isCtrlShiftJ || isCtrlU) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  const handlerContext = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  window.addEventListener('keydown', handlerKey, true)
  window.addEventListener('contextmenu', handlerContext, true)
  
  let checkTimer: number | null = null
  const checkDevtools = () => {
    checkTimer = window.setTimeout(checkDevtools, 1500)
  }
  checkDevtools()
  
  return () => {
    window.removeEventListener('keydown', handlerKey, true)
    window.removeEventListener('contextmenu', handlerContext, true)
    if (checkTimer) {
      window.clearTimeout(checkTimer)
      checkTimer = null
    }
  }
}

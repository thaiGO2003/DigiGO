import { useEffect, useState } from 'react'

export function useMobileKeyboardFix() {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight)

  useEffect(() => {
    // Handler for visual viewport resizing (keyboard open/close)
    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height)
      }
    }

    // Handler for focus events to scroll input into view
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Wait for keyboard to likely appear
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }
    }

    // Add listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }
    window.addEventListener('focusin', handleFocus)

    // Initial check
    if (window.visualViewport) {
      setViewportHeight(window.visualViewport.height)
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
      window.removeEventListener('focusin', handleFocus)
    }
  }, [])

  return { viewportHeight }
}

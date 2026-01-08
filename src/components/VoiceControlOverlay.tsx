import { useState, useEffect, useCallback } from 'react'
import { Mic, MicOff, X } from 'lucide-react'

/**
 * Selector for interactive elements that can be voice-controlled
 */
const INTERACTIVE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface OverlayElement {
  element: HTMLElement
  rect: DOMRect
  index: number
  label: string
}

/**
 * VoiceControlOverlay - Shows numbered badges on interactive elements
 * for voice control accessibility (e.g., "click 1", "click 2")
 *
 * Works with:
 * - macOS Voice Control
 * - Windows Speech Recognition
 * - Dragon NaturallySpeaking
 * - Other voice control software
 */
export function VoiceControlOverlay() {
  const [isActive, setIsActive] = useState(false)
  const [elements, setElements] = useState<OverlayElement[]>([])

  /**
   * Scan the DOM for interactive elements and assign numbers
   */
  const scanElements = useCallback(() => {
    const interactiveElements = document.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTORS)
    const visibleElements: OverlayElement[] = []

    interactiveElements.forEach((el, index) => {
      // Skip hidden elements
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      if (rect.top < 0 || rect.left < 0) return
      if (rect.top > window.innerHeight || rect.left > window.innerWidth) return

      // Get a label for the element
      const label = getElementLabel(el)

      visibleElements.push({
        element: el,
        rect,
        index: visibleElements.length + 1,
        label,
      })
    })

    setElements(visibleElements)
  }, [])

  /**
   * Get a readable label for an element
   */
  const getElementLabel = (el: HTMLElement): string => {
    // Try aria-label first
    const ariaLabel = el.getAttribute('aria-label')
    if (ariaLabel) return ariaLabel

    // Try title
    const title = el.getAttribute('title')
    if (title) return title

    // Try text content (trimmed)
    const text = el.textContent?.trim()
    if (text && text.length < 50) return text

    // Try placeholder for inputs
    if (el instanceof HTMLInputElement) {
      if (el.placeholder) return el.placeholder
      if (el.name) return el.name
    }

    // Fallback to tag name + type
    const type = el.getAttribute('type') || el.tagName.toLowerCase()
    return type
  }

  /**
   * Handle clicking a numbered element
   */
  const handleElementClick = (index: number) => {
    const target = elements.find((e) => e.index === index)
    if (target) {
      target.element.focus()
      target.element.click()
    }
  }

  // Rescan when active state changes or on scroll/resize
  useEffect(() => {
    if (!isActive) {
      setElements([])
      return
    }

    scanElements()

    // Rescan on scroll and resize
    const handleUpdate = () => {
      if (isActive) scanElements()
    }

    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    // Rescan periodically for dynamic content
    const interval = setInterval(handleUpdate, 2000)

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
      clearInterval(interval)
    }
  }, [isActive, scanElements])

  // Keyboard shortcut to toggle (Alt+V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'v') {
        e.preventDefault()
        setIsActive((prev) => !prev)
      }
      // Number keys to click when overlay is active
      if (isActive && e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key, 10)
        handleElementClick(num)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, elements])

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsActive(!isActive)}
        className={`
          fixed bottom-20 right-6 z-50
          p-3 rounded-full shadow-lg
          transition-all duration-200
          ${isActive
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }
        `}
        aria-label={isActive ? 'Disable voice control overlay' : 'Enable voice control overlay'}
        title="Toggle Voice Control Overlay (Alt+V)"
      >
        {isActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>

      {/* Overlay with numbered badges */}
      {isActive && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          aria-hidden="true"
          role="presentation"
        >
          {/* Info banner */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 pointer-events-auto">
            <Mic className="w-4 h-4" />
            <span className="text-sm font-medium">
              Voice Control Active - Say "click" + number or press 1-9
            </span>
            <button
              onClick={() => setIsActive(false)}
              className="p-1 hover:bg-orange-600 rounded"
              aria-label="Close voice control"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Numbered badges */}
          {elements.map((item) => (
            <div
              key={item.index}
              className="absolute pointer-events-auto"
              style={{
                top: item.rect.top + window.scrollY - 8,
                left: item.rect.left + window.scrollX - 8,
              }}
            >
              <button
                onClick={() => handleElementClick(item.index)}
                className="
                  w-6 h-6 rounded-full
                  bg-orange-500 text-white text-xs font-bold
                  flex items-center justify-center
                  shadow-lg border-2 border-white
                  hover:bg-orange-600 hover:scale-110
                  transition-transform
                "
                aria-label={`Click ${item.index}: ${item.label}`}
                title={item.label}
              >
                {item.index <= 99 ? item.index : '99+'}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default VoiceControlOverlay

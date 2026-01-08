import { useState, useRef, useEffect, ReactNode } from 'react'
import { X, Maximize2, Minimize2, Move } from 'lucide-react'

export interface SpatialPosition {
  x: number
  y: number
  z: number
  rotateX?: number
  rotateY?: number
}

interface SpatialWindowProps {
  id: string
  title: string
  children: ReactNode
  position: SpatialPosition
  onPositionChange?: (id: string, position: SpatialPosition) => void
  onClose?: (id: string) => void
  onFocus?: (id: string) => void
  focused?: boolean
  minimized?: boolean
  glassEffect?: boolean
  accentColor?: string
}

export default function SpatialWindow({
  id,
  title,
  children,
  position,
  onPositionChange,
  onClose,
  onFocus,
  focused = false,
  minimized = false,
  glassEffect = true,
  accentColor = 'cyan',
}: SpatialWindowProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isMinimized, setIsMinimized] = useState(minimized)
  const dragRef = useRef<{ startX: number; startY: number; startPos: SpatialPosition } | null>(null)
  const windowRef = useRef<HTMLDivElement>(null)

  // Calculate 3D transform from position
  const transform = `
    translate3d(${position.x}px, ${position.y}px, ${position.z}px)
    rotateX(${position.rotateX || 0}deg)
    rotateY(${position.rotateY || 0}deg)
  `

  // Depth-based effects
  const depthScale = Math.max(0.5, 1 - Math.abs(position.z) / 1000)
  const depthBlur = Math.abs(position.z) / 200
  const depthOpacity = Math.max(0.6, 1 - Math.abs(position.z) / 800)

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return

    onFocus?.(id)

    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true)
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPos: { ...position },
      }
      e.preventDefault()
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return

      const deltaX = e.clientX - dragRef.current.startX
      const deltaY = e.clientY - dragRef.current.startY

      onPositionChange?.(id, {
        ...dragRef.current.startPos,
        x: dragRef.current.startPos.x + deltaX,
        y: dragRef.current.startPos.y + deltaY,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragRef.current = null
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, id, onPositionChange])

  const accentColors: Record<string, string> = {
    cyan: 'border-cyan-500/50 shadow-cyan-500/20',
    orange: 'border-orange-500/50 shadow-orange-500/20',
    purple: 'border-purple-500/50 shadow-purple-500/20',
    green: 'border-green-500/50 shadow-green-500/20',
    red: 'border-red-500/50 shadow-red-500/20',
  }

  return (
    <div
      ref={windowRef}
      className={`
        absolute top-0 left-0 select-none
        transition-all duration-200 ease-out
        ${isDragging ? 'cursor-grabbing' : ''}
      `}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        opacity: depthOpacity,
        filter: depthBlur > 0.5 ? `blur(${depthBlur}px)` : undefined,
        zIndex: focused ? 100 : 50 - Math.floor(position.z / 10),
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`
          rounded-2xl overflow-hidden border
          transition-all duration-200
          ${glassEffect ? 'backdrop-blur-xl bg-slate-900/70' : 'bg-slate-900'}
          ${focused ? `${accentColors[accentColor]} shadow-2xl` : 'border-slate-700/50 shadow-lg'}
          ${isMinimized ? 'h-12' : ''}
        `}
        style={{
          transform: `scale(${depthScale})`,
          transformOrigin: 'center center',
          minWidth: isMinimized ? '200px' : '320px',
        }}
      >
        {/* Title bar */}
        <div
          className={`
            drag-handle flex items-center justify-between px-4 py-3
            border-b border-slate-700/50
            ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
          `}
        >
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-slate-500" />
            <span className="text-white font-medium text-sm">{title}</span>
          </div>

          <div className="window-controls flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
            {onClose && (
              <button
                onClick={() => onClose(id)}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-4">
            {children}
          </div>
        )}
      </div>

      {/* Spatial shadow/glow effect */}
      {focused && (
        <div
          className={`
            absolute inset-0 -z-10 rounded-2xl
            bg-gradient-to-b from-${accentColor}-500/10 to-transparent
            blur-xl
          `}
          style={{
            transform: 'translateZ(-20px) scale(1.1)',
          }}
        />
      )}
    </div>
  )
}

// Utility to arrange windows in a spatial grid
export function createSpatialGrid(
  count: number,
  options: {
    startX?: number
    startY?: number
    spacingX?: number
    spacingY?: number
    depthVariance?: number
    columns?: number
  } = {}
): SpatialPosition[] {
  const {
    startX = 100,
    startY = 100,
    spacingX = 380,
    spacingY = 320,
    depthVariance = 100,
    columns = 3,
  } = options

  return Array.from({ length: count }, (_, i) => ({
    x: startX + (i % columns) * spacingX,
    y: startY + Math.floor(i / columns) * spacingY,
    z: (Math.random() - 0.5) * depthVariance,
    rotateX: (Math.random() - 0.5) * 5,
    rotateY: (Math.random() - 0.5) * 5,
  }))
}

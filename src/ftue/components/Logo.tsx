import { Fuel } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

/** GastownUI Logo - gas pump icon */
export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-xl' },
    md: { icon: 48, text: 'text-3xl' },
    lg: { icon: 64, text: 'text-4xl' },
  }

  const { icon, text } = sizes[size]

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
        <Fuel className="text-white" size={icon} />
      </div>
      {showText && (
        <h1 className={`${text} font-bold text-slate-100`}>
          GastownUI
        </h1>
      )}
    </div>
  )
}

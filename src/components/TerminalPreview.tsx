import { useRef, useEffect } from 'react'

interface TerminalPreviewProps {
  content: string
  className?: string
}

export function TerminalPreview({ content, className = '' }: TerminalPreviewProps) {
  const preRef = useRef<HTMLPreElement>(null)

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight
    }
  }, [content])

  return (
    <pre
      ref={preRef}
      className={`bg-[#1e1e2e] text-[#cdd6f4] font-mono text-xs leading-relaxed p-3 overflow-auto rounded-lg ${className}`}
      style={{
        minHeight: '150px',
        maxHeight: '300px',
        fontFamily: 'Monaco, Menlo, "DejaVu Sans Mono", monospace',
      }}
    >
      {content || (
        <span className="text-slate-500 italic">No output available</span>
      )}
    </pre>
  )
}

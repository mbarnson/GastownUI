/**
 * Skip Link component for accessibility
 * Allows keyboard users to skip directly to main content
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:absolute focus:top-4 focus:left-4 focus:z-[100]
        focus:px-4 focus:py-2
        focus:bg-orange-500 focus:text-white focus:font-semibold
        focus:rounded-lg focus:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-orange-300
        transition-all
      "
    >
      Skip to main content
    </a>
  )
}

export default SkipLink

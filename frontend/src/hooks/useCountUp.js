import { useState, useEffect, useRef } from 'react'

/**
 * Animates a numeric value from its previous state to `target`
 * using an ease-out-expo curve whenever `target` changes.
 *
 * @param {number} target  - The destination value
 * @param {number} duration - Animation duration in ms (default 750)
 * @returns {number} The current animated value (a float — round/format in the consumer)
 */
export function useCountUp(target, duration = 750) {
  const [value, setValue] = useState(0)
  const rafRef    = useRef(null)
  const startRef  = useRef(null)
  const fromRef   = useRef(0)

  useEffect(() => {
    const end  = Number(target) || 0
    const from = fromRef.current

    // Nothing to animate
    if (from === end) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = null

    const animate = (ts) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(elapsed / duration, 1)
      // ease-out-expo: snappy start, soft landing
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
      const current = from + (end - from) * eased
      setValue(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        fromRef.current = end
        setValue(end)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

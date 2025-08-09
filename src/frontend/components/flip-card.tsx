"use client"

import { useState, useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type FlipCardProps = {
  front: ReactNode
  back: ReactNode
  className?: string
  autoFlipDelayMs?: number
  initialFlipped?: boolean
  ariaLabel?: string
}

export function FlipCard({
  front,
  back,
  className,
  autoFlipDelayMs,
  initialFlipped = false,
  ariaLabel = "Flip card",
}: FlipCardProps) {
  const [flipped, setFlipped] = useState(initialFlipped)

  useEffect(() => {
    if (autoFlipDelayMs && !initialFlipped) {
      const t = setTimeout(() => setFlipped(true), autoFlipDelayMs)
      return () => clearTimeout(t)
    }
  }, [autoFlipDelayMs, initialFlipped])

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => setFlipped((f) => !f)}
      className={cn(
        "relative w-full aspect-[3/4] rounded-2xl border",
        "shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 [transform-style:preserve-3d] transition-transform duration-700",
          flipped ? "rotate-y-180" : "rotate-y-0",
        )}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">{front}</div>
        <div className="absolute inset-0 rotate-y-180 [backface-visibility:hidden]">{back}</div>
      </div>
    </button>
  )
}

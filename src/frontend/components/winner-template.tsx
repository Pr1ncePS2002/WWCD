"use client"

import Image from "next/image"
import { Crown } from "lucide-react"
import { cn } from "@/lib/utils"

export function WinnerTemplate({
  title,
  subtitle,
  imageUrl,
  showImage = true,
  className,
}: {
  title: string
  subtitle?: string
  imageUrl?: string
  showImage?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-2xl",
        "border border-white/10 bg-white/[0.04]",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/15 bg-black/50">
            <Crown className="h-4 w-4 text-orange-400" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle ? <p className="text-xs text-white/70">{subtitle}</p> : null}
          </div>
        </div>
        <span className="rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] text-white/80">
          {"Chest Piece Award"}
        </span>
      </div>
      <div className="relative mx-4 mb-4 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/40">
        {showImage ? (
          <Image
            src={imageUrl || "/placeholder.svg?height=640&width=480&query=winner%20card"}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="rounded-md border border-dashed border-white/20 bg-black/40 px-4 py-2 text-sm text-white/80">
              {"Tap to reveal"}
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5" />
      </div>
      <div className="px-4 pb-4 text-xs text-white/70">{"Flip the card to reveal the hungry lad."}</div>
    </div>
  )
}

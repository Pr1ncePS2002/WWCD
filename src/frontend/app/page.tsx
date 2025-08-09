"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Camera, ImagePlus, Loader2, RefreshCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { CameraCapture } from "@/components/camera-capture"
import { cn } from "@/lib/utils"

type PreviewItem = { file: File; url: string }
type Result = { winner1_card_url: string; winner2_card_url: string }

export default function Page() {
  const router = useRouter()

  const [previews, setPreviews] = useState<Array<PreviewItem | null>>([null, null, null, null])
  const [isLoading, setIsLoading] = useState(false)

  // Allow user to choose 2 or 4 photos
  const [requiredCount, setRequiredCount] = useState<2 | 4>(4)

  // Camera modal state
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraTargetIndex, setCameraTargetIndex] = useState<number | null>(null)

  // File input refs
  const initialPickerRef = useRef<HTMLInputElement | null>(null)
  const replacePickerRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ]

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      previews.forEach((p) => p?.url && URL.revokeObjectURL(p.url))
    }
  }, [previews])

  // If switching to 2-photo mode, clear extra slots and revoke their URLs
  useEffect(() => {
    if (requiredCount === 2) {
      setPreviews((prev) => {
        const next: Array<PreviewItem | null> = [prev[0], prev[1], null, null]
        prev.slice(2).forEach((p) => p?.url && URL.revokeObjectURL(p.url))
        return next
      })
    }
  }, [requiredCount])

  const selectedCount = useMemo(() => previews.filter(Boolean).length, [previews])
  const canPredict = selectedCount === requiredCount

  function handleInitialPick(files: FileList | null) {
    if (!files) return
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (images.length !== requiredCount) {
      toast.error(
        `Exactly ${requiredCount} image${requiredCount === 2 ? "" : "s"} required\nPlease select exactly ${requiredCount} image files.`,
      )
      return
    }
    previews.forEach((p) => p?.url && URL.revokeObjectURL(p.url))
    const filled = images.map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    const next: Array<PreviewItem | null> =
      requiredCount === 2 ? [filled[0], filled[1], null, null] : [filled[0], filled[1], filled[2], filled[3]]
    setPreviews(next)
  }

  function handleReplaceAt(index: number, files: FileList | null) {
    if (!files || files.length === 0) return
    if (index >= requiredCount) {
      toast.error(`This slot is disabled in ${requiredCount}-photo mode`)
      return
    }
    const file = files[0]
    if (!file.type.startsWith("image/")) {
      toast.error("Not an image\nPlease choose an image file.")
      return
    }
    setPreviews((prev) => {
      const next = [...prev]
      const old = next[index]
      if (old?.url) URL.revokeObjectURL(old.url)
      next[index] = { file, url: URL.createObjectURL(file) }
      return next
    })
  }

  // Camera helpers
  function openCameraFor(index: number | null) {
    setCameraTargetIndex(index)
    setCameraOpen(true)
  }

  function handleCameraCaptured(file: File) {
    const preview: PreviewItem = { file, url: URL.createObjectURL(file) }
    setPreviews((prev) => {
      const next = [...prev]
      const allowedRange = requiredCount === 2 ? [0, 1] : [0, 1, 2, 3]
      const firstEmpty = allowedRange.find((i) => prev[i] === null)
      const target = cameraTargetIndex !== null ? cameraTargetIndex : firstEmpty
      const idx = target !== undefined && target !== -1 ? target : allowedRange[0]
      if (idx >= requiredCount) return prev // guard
      const old = next[idx]
      if (old?.url) URL.revokeObjectURL(old.url)
      next[idx] = preview
      return next
    })
  }

  async function onPredict() {
    if (!canPredict) return
    try {
      setIsLoading(true)
      const form = new FormData()
      ;[0, 1, 2, 3].forEach((idx) => {
        const p = previews[idx]
        if (p?.file && idx < requiredCount) {
          form.append("images", p.file, p.file.name || `image-${idx + 1}.jpg`)
        }
      })
      const res = await fetch("/predict-winners", { method: "POST", body: form })
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Request failed")
      const data = (await res.json()) as Result
      // Persist also the chosen count so results page knows how many to show
      sessionStorage.setItem("alfahm-winners", JSON.stringify({ ...data, count: requiredCount }))
      router.push("/results")
    } catch (err: any) {
      setIsLoading(false)
      toast.error(`Prediction failed\n${err?.message || "Something went wrong. Please try again."}`)
    }
  }

  function resetAll() {
    previews.forEach((p) => p?.url && URL.revokeObjectURL(p.url))
    setPreviews([null, null, null, null])
    setIsLoading(false)
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
      {/* Subtle warm glow like chaicode hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full"
        style={{
          background: "radial-gradient(200px 200px at 50% 50%, rgba(255,128,0,0.25), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="text-center">
          <div className="inline-block">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              {"Winner Winner Chicken Dinner"}
            </h1>
            <div className="mx-auto mt-3 h-1 w-48 rounded-full bg-orange-500/90" />
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-white/70">
            {"Upload 2 or 4 images of friends, and we’ll crown the most excited chest piece winners! 🍗"}
          </p>

          <div className="mx-auto mt-6 h-[1px] w-56 rounded-full bg-orange-500/20" />
        </header>

        <section className="mt-8 sm:mt-10 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.8)] backdrop-blur">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 border-b border-white/10 px-4 py-4">
            {/* Count selector */}
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-8 rounded-full px-3 text-xs",
                  requiredCount === 2 ? "bg-orange-600 text-white hover:bg-orange-500" : "text-white/80",
                )}
                onClick={() => setRequiredCount(2)}
              >
                {"2 Photos"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-8 rounded-full px-3 text-xs",
                  requiredCount === 4 ? "bg-orange-600 text-white hover:bg-orange-500" : "text-white/80",
                )}
                onClick={() => setRequiredCount(4)}
              >
                {"4 Photos"}
              </Button>
            </div>

            <Button
              onClick={() => initialPickerRef.current?.click()}
              type="button"
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              {`Select ${requiredCount} Images`}
            </Button>
            <input
              ref={initialPickerRef}
              className="hidden"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleInitialPick(e.target.files)}
            />

            <Button
              onClick={() => openCameraFor(null)}
              variant="outline"
              type="button"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Camera className="mr-2 h-4 w-4" />
              {"Use Camera"}
            </Button>

            <Button
              onClick={resetAll}
              variant="outline"
              type="button"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {"Reset"}
            </Button>
          </div>

          {/* Single square with 4 sections */}
          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <div
              className={cn(
                "relative mx-auto aspect-square overflow-hidden rounded-xl",
                "w-[280px] sm:w-[340px] md:w-[400px] lg:w-[440px]",
                "border border-white/10 bg-black/60",
              )}
            >
              <div className="grid h-full w-full grid-cols-2 grid-rows-2">
                {[0, 1, 2, 3].map((i) => {
                  const item = previews[i]
                  const disabledSlot = i >= requiredCount
                  return (
                    <div key={i} className="relative">
                      {/* Dividers */}
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-0",
                          i % 2 === 0 ? "border-r border-white/10" : "",
                          i < 2 ? "border-b border-white/10" : "",
                        )}
                      />
                      {/* Click to upload from files */}
                      <button
                        type="button"
                        onClick={() => replacePickerRefs[i].current?.click()}
                        disabled={isLoading || disabledSlot}
                        aria-label={item ? `Replace image ${i + 1}` : `Add image ${i + 1}`}
                        className={cn(
                          "group relative h-full w-full overflow-hidden",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50",
                          disabledSlot && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-xs text-white/85">
                          {"#" + (i + 1)}
                        </div>
                        {item ? (
                          <>
                            <img
                              src={item.url || "/placeholder.svg"}
                              alt={`Selected friend ${i + 1} preview`}
                              className="h-full w-full object-cover"
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                              <div className="m-2 rounded-md border border-white/15 bg-black/70 px-2.5 py-1 text-center text-xs font-medium text-white/90">
                                {"Click to replace"}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center text-center">
                            <div className="rounded-md border border-dashed border-white/20 p-3">
                              <ImagePlus className="h-6 w-6 text-white/70" />
                            </div>
                            <p className="mt-2 text-sm text-white/80">
                              {disabledSlot ? "Disabled" : "Click to add image"}
                            </p>
                            <p className="text-xs text-white/60">
                              {"Slot "}
                              {i + 1}
                              {" of 4"}
                            </p>
                          </div>
                        )}
                      </button>
                      <input
                        ref={replacePickerRefs[i]}
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleReplaceAt(i, e.target.files)}
                      />

                      {/* Camera overlay control */}
                      {!disabledSlot && (
                        <span
                          role="button"
                          tabIndex={0}
                          title="Use Camera"
                          onClick={(e) => {
                            e.stopPropagation()
                            openCameraFor(i)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              openCameraFor(i)
                            }
                          }}
                          className={cn(
                            "absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center",
                            "rounded-full border border-white/20 bg-black/60 text-white/90",
                            "hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-orange-500/50",
                          )}
                        >
                          <Camera className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Predict CTA */}
            <div className="mt-8 flex items-center justify-center">
              <Button
                size="lg"
                disabled={!canPredict || isLoading}
                onClick={onPredict}
                type="button"
                className="h-12 px-8 text-base sm:text-lg bg-orange-600 hover:bg-orange-500 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {"Predicting..."}
                  </>
                ) : (
                  `Predict Winner${requiredCount === 4 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Camera dialog */}
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCameraCaptured}
        initialFacing="environment"
      />
    </main>
  )
}

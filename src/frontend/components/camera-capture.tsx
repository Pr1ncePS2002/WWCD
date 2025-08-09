"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Camera, CameraOff, RefreshCcw, RotateCw } from "lucide-react"

type Facing = "environment" | "user"

export function CameraCapture({
  open = false,
  onOpenChange,
  onCapture,
  initialFacing = "environment",
  title = "Take a photo",
  description = "Grant camera permission, frame the subject, and capture.",
}: {
  open?: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
  initialFacing?: Facing
  title?: string
  description?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [facing, setFacing] = useState<Facing>(initialFacing)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    const s = streamRef.current
    if (s) {
      s.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsReady(false)
  }, [])

  const startStream = useCallback(async () => {
    stopStream()
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await (videoRef.current as HTMLVideoElement).play()
        setIsReady(true)
      }
    } catch (e: any) {
      setError(e?.message || "Unable to access camera.")
    }
  }, [facing, stopStream])

  useEffect(() => {
    if (open) startStream()
    else stopStream()
    return () => stopStream()
  }, [open, startStream, stopStream])

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video) return
    const vW = video.videoWidth
    const vH = video.videoHeight
    if (!vW || !vH) return

    const size = Math.min(1024, Math.max(512, Math.min(vW, vH)))
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Square center-crop
    const videoRatio = vW / vH
    let sW = vW
    let sH = vH
    if (videoRatio > 1) {
      sH = vH
      sW = vH
    } else {
      sW = vW
      sH = vW
    }
    const sX = (vW - sW) / 2
    const sY = (vH - sH) / 2

    ctx.drawImage(video, sX, sY, sW, sH, 0, 0, size, size)

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9))
    if (!blob) return
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })
    onCapture(file)
    onOpenChange(false)
  }

  function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    onCapture(f)
    onOpenChange(false)
    e.currentTarget.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-black text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/70">{description}</DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/50">
          <div className="relative w-full aspect-square">
            <video
              ref={videoRef}
              playsInline
              muted
              className={isReady ? "absolute inset-0 h-full w-full object-cover" : "hidden"}
            />
            {!isReady && !error && (
              <div className="flex h-full w-full items-center justify-center text-white/80">
                <RotateCw className="mr-2 h-5 w-5 animate-spin" />
                {"Starting camera..."}
              </div>
            )}
            {error && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 py-8 text-center text-red-300">
                <CameraOff className="h-6 w-6" />
                <p className="text-sm">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={startStream}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {"Retry"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleUploadChange} className="hidden" />

        <DialogFooter className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              disabled={!isReady}
            >
              <Camera className="mr-2 h-4 w-4" />
              {`Switch to ${facing === "environment" ? "front" : "back"}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={startStream}
              disabled={!open}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Restart
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => uploadInputRef.current?.click()}
            >
              Upload picture
            </Button>
            <Button
              onClick={handleCapture}
              disabled={!isReady}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              Click picture
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

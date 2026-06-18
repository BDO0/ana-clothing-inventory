// BarcodeScanner — camera-based barcode/QR scanner using @zxing/library
// Safe to use: only requests camera when explicitly opened
// Cleans up camera stream on unmount/close — zero memory leaks

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library"
import { X, Camera, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [status, setStatus] = useState<"loading" | "scanning" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    async function startScanning() {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()

        if (devices.length === 0) {
          setErrorMsg("No camera found on this device.")
          setStatus("error")
          return
        }

        // Prefer the rear camera on mobile devices
        const rearCamera = devices.find(d =>
          /back|rear|environment/i.test(d.label)
        ) ?? devices[0]

        setStatus("scanning")

        await reader.decodeFromVideoDevice(
          rearCamera.deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              onScan(result.getText())
              cleanup()
            } else if (err && !(err instanceof NotFoundException)) {
              console.warn("[BarcodeScanner]", err)
            }
          }
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera access denied."
        setErrorMsg(msg.includes("Permission") ? "Camera permission denied. Please allow camera access and try again." : msg)
        setStatus("error")
      }
    }

    startScanning()

    return () => cleanup()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cleanup() {
    readerRef.current?.reset()
    readerRef.current = null
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <div className="flex items-center gap-2 text-white">
          <Camera size={18} />
          <span className="font-semibold text-sm">Scan Barcode / QR Code</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 h-8 w-8 p-0"
          onClick={() => { cleanup(); onClose() }}
        >
          <X size={18} />
        </Button>
      </div>

      {/* Camera viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />

        {/* Scanning reticle overlay */}
        {status === "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Corner marks */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#6B2A1F] rounded-tl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#6B2A1F] rounded-tr" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#6B2A1F] rounded-bl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#6B2A1F] rounded-br" />
              {/* Animated scan line */}
              <div className="absolute left-2 right-2 h-0.5 bg-[#6B2A1F]/80 animate-scan-line" />
            </div>
          </div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-3">
            <Loader2 size={36} className="animate-spin text-[#6B2A1F]" />
            <span className="text-sm">Starting camera…</span>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white gap-4 px-6">
            <Camera size={48} className="text-[#6B2A1F]" />
            <p className="text-center text-sm text-white/80">{errorMsg}</p>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => { cleanup(); onClose() }}
            >
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {status === "scanning" && (
        <div className="px-4 py-3 bg-black/80 text-center text-xs text-white/50">
          Point your camera at a barcode or QR code
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useRef, useTransition, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  Ticket,
  User,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'

type ScanResult = {
  id: string
  code: string
  status: 'valid' | 'already' | 'invalid' | 'error'
  attendeeName?: string
  eventName?: string
  checkedInAt?: string
  message?: string
  timestamp: string
}

type EventOption = {
  id: number
  title: string
}

export default function OrganiserScannerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEventId = searchParams.get('event')

  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || 'all')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const [manualCode, setManualCode] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef<boolean>(false)

  // Sound synthesizer via Web Audio API
  const playChime = (type: 'valid' | 'already' | 'invalid') => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'valid') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12) // A5
        gain.gain.setValueAtTime(0.18, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.25)
      } else if (type === 'already') {
        osc.frequency.setValueAtTime(440, ctx.currentTime) // A4
        gain.gain.setValueAtTime(0.18, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.25)
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime) // A3 low alert
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch {}
  }

  // Load events owned by this organiser
  useEffect(() => {
    fetch('/api/organiser/events', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace('/organiser/login')
          return null
        }
        return res.ok ? res.json() : null
      })
      .then((data) => {
        if (data?.docs && Array.isArray(data.docs)) {
          setEvents(data.docs.map((d: any) => ({ id: d.id, title: d.title })))
        }
      })
      .catch(() => {})
  }, [router])

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null)
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
      }
      setCameraActive(true)
      scanningRef.current = true
      startScanningLoop()
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission denied or camera not found.')
      setCameraActive(false)
    }
  }

  // Stop Camera Stream
  const stopCamera = () => {
    scanningRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Native BarcodeDetector loop when available
  const startScanningLoop = () => {
    if (!('BarcodeDetector' in window)) {
      return
    }

    const barcodeDetector = new (window as any).BarcodeDetector({
      formats: ['qr_code'],
    })

    const detect = async () => {
      if (!scanningRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        if (scanningRef.current) requestAnimationFrame(detect)
        return
      }

      try {
        const barcodes = await barcodeDetector.detect(videoRef.current)
        if (barcodes && barcodes.length > 0 && !isProcessing) {
          const rawValue = barcodes[0].rawValue
          if (rawValue) {
            handleScanCode(rawValue)
            // Pause momentarily so the same QR isn't scanned multiple times in a split second
            await new Promise((r) => setTimeout(r, 1600))
          }
        }
      } catch {}

      if (scanningRef.current) {
        requestAnimationFrame(detect)
      }
    }

    requestAnimationFrame(detect)
  }

  // Process a scanned or typed ticket code
  const handleScanCode = async (rawInput: string) => {
    const trimmed = rawInput.trim()
    if (!trimmed || isProcessing) return

    // Extract code if input is a URL like /tickets/pass/:code or https://domain/pass/:code
    let cleanCode = trimmed
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed)
        const parts = url.pathname.split('/').filter(Boolean)
        cleanCode = parts[parts.length - 1] || trimmed
      }
    } catch {}

    setIsProcessing(true)

    try {
      // Step 1: Look up ticket
      const lookupRes = await fetch(`/api/tickets/lookup/${encodeURIComponent(cleanCode)}`, {
        credentials: 'include',
      })

      if (!lookupRes.ok) {
        const result: ScanResult = {
          id: String(Date.now()),
          code: cleanCode,
          status: 'invalid',
          message: 'Ticket not found or invalid format',
          timestamp: new Date().toLocaleTimeString('en-GB'),
        }
        setCurrentResult(result)
        setScanHistory((prev) => [result, ...prev.slice(0, 19)])
        playChime('invalid')
        setIsProcessing(false)
        return
      }

      const ticketDoc = await lookupRes.json()
      const eventName = ticketDoc.event?.title || 'Event'

      // Check event scope if specific event is selected
      if (selectedEventId !== 'all') {
        const ticketEventId = typeof ticketDoc.event === 'object' ? ticketDoc.event?.id : ticketDoc.event
        if (String(ticketEventId) !== selectedEventId) {
          const result: ScanResult = {
            id: String(Date.now()),
            code: cleanCode,
            status: 'error',
            attendeeName: ticketDoc.attendeeName,
            eventName,
            message: `Ticket is for "${eventName}", not the selected event.`,
            timestamp: new Date().toLocaleTimeString('en-GB'),
          }
          setCurrentResult(result)
          setScanHistory((prev) => [result, ...prev.slice(0, 19)])
          playChime('invalid')
          setIsProcessing(false)
          return
        }
      }

      // Step 2: Check if already checked in
      if (ticketDoc.status === 'checked-in') {
        const result: ScanResult = {
          id: String(Date.now()),
          code: cleanCode,
          status: 'already',
          attendeeName: ticketDoc.attendeeName || 'Guest',
          eventName,
          checkedInAt: ticketDoc.checkedInAt,
          message: 'Already checked in',
          timestamp: new Date().toLocaleTimeString('en-GB'),
        }
        setCurrentResult(result)
        setScanHistory((prev) => [result, ...prev.slice(0, 19)])
        playChime('already')
        setIsProcessing(false)
        return
      }

      // Step 3: Perform check-in
      const checkInRes = await fetch(`/api/tickets/${ticketDoc.id}/check-in`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!checkInRes.ok) {
        const err = await checkInRes.json().catch(() => ({}))
        const result: ScanResult = {
          id: String(Date.now()),
          code: cleanCode,
          status: 'error',
          attendeeName: ticketDoc.attendeeName || 'Guest',
          eventName,
          message: err.error || 'Check-in failed',
          timestamp: new Date().toLocaleTimeString('en-GB'),
        }
        setCurrentResult(result)
        setScanHistory((prev) => [result, ...prev.slice(0, 19)])
        playChime('invalid')
        setIsProcessing(false)
        return
      }

      const updated = await checkInRes.json()
      const result: ScanResult = {
        id: String(Date.now()),
        code: cleanCode,
        status: 'valid',
        attendeeName: ticketDoc.attendeeName || 'Guest',
        eventName,
        checkedInAt: updated.checkedInAt || new Date().toISOString(),
        message: 'Valid admission ticket',
        timestamp: new Date().toLocaleTimeString('en-GB'),
      }
      setCurrentResult(result)
      setScanHistory((prev) => [result, ...prev.slice(0, 19)])
      playChime('valid')
      setManualCode('')
    } catch (err: any) {
      const result: ScanResult = {
        id: String(Date.now()),
        code: cleanCode,
        status: 'error',
        message: err.message || 'Network error looking up ticket',
        timestamp: new Date().toLocaleTimeString('en-GB'),
      }
      setCurrentResult(result)
      setScanHistory((prev) => [result, ...prev.slice(0, 19)])
      playChime('invalid')
    } finally {
      setIsProcessing(false)
    }
  }

  // Session Statistics
  const sessionStats = useMemo(() => {
    const valid = scanHistory.filter((s) => s.status === 'valid').length
    const already = scanHistory.filter((s) => s.status === 'already').length
    const invalid = scanHistory.filter((s) => s.status === 'invalid' || s.status === 'error').length
    return { total: scanHistory.length, valid, already, invalid }
  }, [scanHistory])

  return (
    <>
      <OrganiserHeader title="Scanner" />
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Top Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/organiser/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
            >
              <ArrowLeft size={13} className="text-alpine-500" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Ticket Gate Scanner
              </h1>
              <span className="px-2 py-0.5 rounded-[3px] bg-alpine-50 text-alpine-700 dark:bg-alpine-950/60 dark:text-alpine-300 border border-alpine-500/30 text-[10px] font-mono font-bold uppercase">
                DOOR ENTRY
              </span>
            </div>
            <p className="text-xs sm:text-sm font-mono text-muted-foreground mt-0.5">
              Live QR code verification and instant check-in for ticket holders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="gap-1.5 font-mono text-xs h-8 rounded-[4px] border-alpine-500/35 hover:bg-alpine-50 dark:hover:bg-slate-800"
            >
              {soundEnabled ? (
                <>
                  <Volume2 size={13} className="text-alpine-500" /> Sound: On
                </>
              ) : (
                <>
                  <VolumeX size={13} className="text-muted-foreground" /> Sound: Off
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 4 Session Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-[6px] border border-alpine-500/30 bg-white dark:bg-slate-900 shadow-card space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Total Scanned
            </span>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
              {sessionStats.total}
            </div>
          </div>
          <div className="p-3 rounded-[6px] border border-emerald-500/30 bg-white dark:bg-slate-900 shadow-card space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Checked In
            </span>
            <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {sessionStats.valid}
            </div>
          </div>
          <div className="p-3 rounded-[6px] border border-amber-500/30 bg-white dark:bg-slate-900 shadow-card space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Already Used
            </span>
            <div className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400">
              {sessionStats.already}
            </div>
          </div>
          <div className="p-3 rounded-[6px] border border-red-500/30 bg-white dark:bg-slate-900 shadow-card space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400">
              Invalid Codes
            </span>
            <div className="text-xl font-mono font-bold text-red-600 dark:text-red-400">
              {sessionStats.invalid}
            </div>
          </div>
        </div>

        {/* Event Scope Selector */}
        <div className="p-3.5 rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-alpine-500 shrink-0" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Active Show Target:
            </span>
          </div>

          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="h-8 rounded-[4px] border border-alpine-500/30 bg-alpine-50/40 dark:bg-slate-950 px-3 text-xs font-mono w-full sm:w-72"
          >
            <option value="all">Any Event (Automatic Detection)</option>
            {events.map((ev) => (
              <option key={ev.id} value={String(ev.id)}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>

        {/* Scanner Body: Camera Viewfinder & Manual Input */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Camera Viewfinder (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanLine size={16} className="text-alpine-500" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Live Optical Camera
                    </span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={cameraActive ? 'destructive' : 'default'}
                    onClick={cameraActive ? stopCamera : startCamera}
                    className="h-7 px-3 text-xs font-mono rounded-[4px] gap-1.5 bg-alpine-600 hover:bg-alpine-700 text-white"
                  >
                    {cameraActive ? (
                      <>
                        <CameraOff size={12} /> Pause Camera
                      </>
                    ) : (
                      <>
                        <Camera size={12} /> Start Camera
                      </>
                    )}
                  </Button>
                </div>

                {/* Viewfinder Window */}
                <div className="relative aspect-video w-full rounded-[4px] bg-slate-950 overflow-hidden border border-alpine-500/30 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  />

                  {cameraActive ? (
                    <>
                      {/* Targeting Reticle */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-56 h-56 border-2 border-alpine-500/40 rounded-[6px]">
                          {/* Corner highlights */}
                          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-alpine-400" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-alpine-400" />
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-alpine-400" />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-alpine-400" />

                          {/* Animated Scanline */}
                          <div className="absolute left-0 right-0 h-0.5 bg-alpine-400 shadow-[0_0_8px_#dc153c] animate-pulse" style={{ top: '50%' }} />
                        </div>
                      </div>

                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-[3px] bg-slate-900/80 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        LISTENING FOR QR CODE
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 space-y-2 text-slate-400">
                      <Camera size={36} className="mx-auto opacity-40 text-alpine-500" />
                      <p className="text-xs font-mono font-semibold text-slate-300">
                        Camera Viewfinder Idle
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        Click "Start Camera" above to enable live QR scanning, or use manual code entry below.
                      </p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-3 rounded-[4px] border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-mono flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Manual Code Fallback */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleScanCode(manualCode)
                  }}
                  className="pt-2 space-y-2"
                >
                  <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Manual Ticket Code Entry
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 min-w-0">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Paste code or ticket URL..."
                        className="pl-8 h-8 rounded-[4px] border-alpine-500/30 text-xs font-mono bg-alpine-50/40 dark:bg-slate-950"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isProcessing || !manualCode.trim()}
                      className="h-8 px-4 rounded-[4px] text-xs font-mono font-bold bg-alpine-600 hover:bg-alpine-700 text-white shrink-0"
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : 'VERIFY & CHECK IN'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Result Banner & Scan History (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Scan Result Card */}
            {currentResult ? (
              <div
                className={`p-4 rounded-[6px] border space-y-3 transition-all ${
                  currentResult.status === 'valid'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
                    : currentResult.status === 'already'
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100'
                    : 'border-red-500/50 bg-red-500/10 text-red-900 dark:text-red-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold uppercase tracking-wider ${
                      currentResult.status === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : currentResult.status === 'already'
                        ? 'bg-amber-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {currentResult.status === 'valid'
                      ? '✓ CHECKED IN'
                      : currentResult.status === 'already'
                      ? '⚠ ALREADY USED'
                      : '✕ INVALID TICKET'}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {currentResult.timestamp}
                  </span>
                </div>

                <div>
                  <h3 className="font-sans font-bold text-base text-slate-900 dark:text-slate-100">
                    {currentResult.attendeeName || 'Unknown Attendee'}
                  </h3>
                  {currentResult.eventName && (
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {currentResult.eventName}
                    </p>
                  )}
                  {currentResult.message && (
                    <p className="text-[11px] font-mono text-muted-foreground mt-1">
                      {currentResult.message}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-alpine-500/20 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground">Code: {currentResult.code}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentResult(null)}
                    className="h-6 px-2 text-[10px] rounded-[3px]"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-[6px] border border-alpine-500/25 bg-alpine-50/40 dark:bg-slate-900 text-center py-6 text-slate-400 font-mono space-y-1.5">
                <ScanLine size={24} className="mx-auto text-alpine-500 opacity-50" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Ready for Next Scan</p>
                <p className="text-[11px] text-muted-foreground">
                  Point camera at attendee's ticket or enter code to verify admission.
                </p>
              </div>
            )}

            {/* Recent Scans Session Log */}
            <div className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <History size={14} className="text-alpine-500" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Session Log ({scanHistory.length})
                  </span>
                </div>
                {scanHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScanHistory([])}
                    className="text-[10px] font-mono text-muted-foreground hover:text-foreground"
                  >
                    Clear Log
                  </button>
                )}
              </div>

              {scanHistory.length === 0 ? (
                <div className="py-6 text-center text-[11px] font-mono text-muted-foreground">
                  No scans recorded in this browser session.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto divide-y divide-alpine-500/15">
                  {scanHistory.map((scan) => (
                    <div
                      key={scan.id}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {scan.attendeeName || scan.code}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>{scan.timestamp}</span>
                          <span>•</span>
                          <span className="truncate">{scan.code.slice(0, 8)}…</span>
                        </div>
                      </div>

                      <span
                        className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase shrink-0 ${
                          scan.status === 'valid'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : scan.status === 'already'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {scan.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

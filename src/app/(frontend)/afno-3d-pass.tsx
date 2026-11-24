'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Sparkles, ShieldCheck, Copy, Check, RotateCw, Orbit, Crown, Ticket, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TierConfig {
  name: string
  badgeText: string
  badgeClasses: string
  stubTag: string
  stubClasses: string
  gate: string
  gateColor: string
  seat: string
  serial: string
  accent1: string
  accent2: string
  accent3: string
  glow: string
  perks: string
  price: string
}

const TIER_CONFIG: Record<string, TierConfig> = {
  vip: {
    name: 'VIP All-Access',
    badgeText: 'AFNO VIP ALL-ACCESS PASS',
    badgeClasses: 'bg-alpine-500/20 text-alpine-400 border-alpine-400/40 shadow-[0_0_15px_rgba(220,21,60,0.35)]',
    stubTag: 'VIP-PASS',
    stubClasses: 'bg-alpine-500/20 text-alpine-300 border-alpine-400/40',
    gate: 'GATE A • VIP LOUNGE',
    gateColor: 'text-alpine-400',
    seat: 'ROYAL TIER • A-01',
    serial: 'AFNO-8848-VIP',
    accent1: '#dc153c',
    accent2: '#f59e0b',
    accent3: '#ec4899',
    glow: 'rgba(220, 21, 60, 0.45)',
    perks: 'Priority express entry at Gate A, complimentary backstage lounge refreshments, dedicated meet & greet access, and commemorative Afno NFC wristband.',
    price: '£45.00',
  },
  artist: {
    name: 'Artist & Guest',
    badgeText: 'AFNO ARTIST & CREW PASS',
    badgeClasses: 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.35)]',
    stubTag: 'BACKSTAGE',
    stubClasses: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    gate: 'STAGE DOOR • NORTH',
    gateColor: 'text-amber-300',
    seat: 'GREENROOM • B-04',
    serial: 'AFNO-9920-ART',
    accent1: '#f59e0b',
    accent2: '#dc153c',
    accent3: '#06b6d4',
    glow: 'rgba(245, 158, 11, 0.4)',
    perks: 'Full backstage & production access, artist hospitality suite, direct stage-wing viewing, and soundcheck early entry.',
    price: 'Guest Pass',
  },
  general: {
    name: 'General Entry',
    badgeText: 'AFNO GENERAL ADMISSION',
    badgeClasses: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
    stubTag: 'GA-2026',
    stubClasses: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    gate: 'MAIN PLAZA • SOUTH',
    gateColor: 'text-cyan-300',
    seat: 'MAIN ARENA • STANDING',
    serial: 'AFNO-2026-GEN',
    accent1: '#06b6d4',
    accent2: '#3b82f6',
    accent3: '#dc153c',
    glow: 'rgba(6, 182, 212, 0.35)',
    perks: 'Unrestricted access to Main Arena cultural performances, food & artisan night market, community music stage, and live festival celebrations.',
    price: '£20.00',
  },
}

// Deterministic SVG QR Code Generator
function generateQrSvgCells(seed: string): string {
  const size = 29
  let cells = ''

  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isBorder = x === 0 || x === 6 || y === 0 || y === 6
        const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4
        if (isBorder || isCenter) {
          cells += `<rect x="${ox + x}" y="${oy + y}" width="1" height="1" fill="#06070a"/>`
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(size - 7, 0)
  drawFinder(0, size - 7)

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (x === 0 || x === 4 || y === 0 || y === 4 || (x === 2 && y === 2)) {
        cells += `<rect x="${20 + x}" y="${20 + y}" width="1" height="1" fill="#06070a"/>`
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) {
      cells += `<rect x="${i}" y="6" width="1" height="1" fill="#06070a"/>`
      cells += `<rect x="6" y="${i}" width="1" height="1" fill="#06070a"/>`
    }
  }

  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inTopLeft = x < 8 && y < 8
      const inTopRight = x >= size - 8 && y < 8
      const inBottomLeft = x < 8 && y >= size - 8
      const inAlign = x >= 20 && x <= 24 && y >= 20 && y <= 24
      const onTiming = x === 6 || y === 6

      if (inTopLeft || inTopRight || inBottomLeft || inAlign || onTiming) continue

      hash ^= x * 37 + y * 131
      hash = Math.imul(hash, 16777619)
      if ((hash >>> 0) % 100 < 48) {
        cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#06070a"/>`
      }
    }
  }

  return cells
}

// Code-128 Barcode Generator
function generateBarcodeSvgBars(seed: string): string {
  let bars = ''
  let x = 2
  let hash = 5381

  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) + seed.charCodeAt(i)
  }

  bars += `<rect x="${x}" y="0" width="2" height="40" fill="currentColor"/>`
  x += 4
  bars += `<rect x="${x}" y="0" width="1" height="40" fill="currentColor"/>`
  x += 3

  while (x < 210) {
    hash = Math.imul(hash ^ (x * 17), 2654435761)
    const barWidth = ((hash >>> 0) % 3) + 1
    const gapWidth = ((hash >>> 4) % 3) + 1
    bars += `<rect x="${x}" y="0" width="${barWidth}" height="40" fill="currentColor"/>`
    x += barWidth + gapWidth
  }

  bars += `<rect x="213" y="0" width="1" height="40" fill="currentColor"/>`
  bars += `<rect x="216" y="0" width="2" height="40" fill="currentColor"/>`

  return bars
}

export function Afno3DPass() {
  const [activeTier, setActiveTier] = useState<string>('vip')
  const [isFlipped, setIsFlipped] = useState(false)
  const [copied, setCopied] = useState(false)

  // Physics state
  const stageRef = useRef<HTMLDivElement>(null)
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef<number | null>(null)

  const [springStyle, setSpringStyle] = useState({
    rx: 0,
    ry: 0,
    px: 50,
    py: 50,
    hyp: 0,
  })

  const physicsRef = useRef({
    targetRx: 0,
    targetRy: 0,
    currentRx: 0,
    currentRy: 0,
    targetPx: 50,
    targetPy: 50,
    currentPx: 50,
    currentPy: 50,
    isHovering: false,
    clock: 0,
  })

  const tier = TIER_CONFIG[activeTier] || TIER_CONFIG.vip

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))

    const maxTilt = 12
    physicsRef.current.targetRx = (0.5 - normY) * 2 * maxTilt
    physicsRef.current.targetRy = (normX - 0.5) * 2 * maxTilt
    physicsRef.current.targetPx = normX * 100
    physicsRef.current.targetPy = normY * 100
    physicsRef.current.isHovering = true
  }, [])

  useEffect(() => {
    const LERP_FACTOR = 0.095

    const loop = () => {
      const p = physicsRef.current
      p.clock += 0.02

      p.currentRx += (p.targetRx - p.currentRx) * LERP_FACTOR
      p.currentRy += (p.targetRy - p.currentRy) * LERP_FACTOR
      p.currentPx += (p.targetPx - p.currentPx) * LERP_FACTOR
      p.currentPy += (p.targetPy - p.currentPy) * LERP_FACTOR

      const hyp = Math.min(1, Math.hypot(p.currentRx / 12, p.currentRy / 12))

      setSpringStyle({
        rx: p.currentRx,
        ry: p.currentRy,
        px: p.currentPx,
        py: p.currentPy,
        hyp,
      })

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const copySerial = () => {
    navigator.clipboard?.writeText(tier.serial)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const qrCells = generateQrSvgCells(tier.serial)
  const barcodeBars = generateBarcodeSvgBars(tier.serial)

  return (
    <div className="w-full flex flex-col items-center px-1 sm:px-0">
      {/* Controls Bar: Tiers and Flip Pass */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-5 z-20">
        {/* Tier Selector Pills with dedicated dark backgrounds and clear hover states */}
        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-700/80 shadow-md">
          {Object.entries(TIER_CONFIG).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setActiveTier(key)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTier === key
                  ? 'bg-alpine-600 text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Flip Action Button */}
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-alpine-600 hover:bg-alpine-700 text-white border border-alpine-500/50 transition-all active:scale-95 shadow-md"
        >
          <RotateCw size={14} className={isFlipped ? 'rotate-180 transition-transform duration-300' : 'transition-transform duration-300'} />
          <span>{isFlipped ? 'View Front' : 'Flip Ticket Pass'}</span>
        </button>
      </div>

      {/* 3D Ticket Stage */}
      <div
        ref={stageRef}
        onMouseEnter={() => {
          physicsRef.current.isHovering = true
        }}
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onMouseLeave={() => {
          physicsRef.current.isHovering = false
          physicsRef.current.targetRx = 0
          physicsRef.current.targetRy = 0
          physicsRef.current.targetPx = 50
          physicsRef.current.targetPy = 50
        }}
        onTouchStart={(e) => {
          if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
        }}
        onTouchEnd={() => {
          physicsRef.current.isHovering = false
          physicsRef.current.targetRx = 0
          physicsRef.current.targetRy = 0
        }}
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={(e) => {
          const dx = Math.abs(e.clientX - pointerDownPos.current.x)
          const dy = Math.abs(e.clientY - pointerDownPos.current.y)
          if (dx < 6 && dy < 6) setIsFlipped((prev) => !prev)
        }}
        className="w-full max-w-[840px] cursor-pointer select-none py-2"
        style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
      >
        <div
          className="w-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${springStyle.rx.toFixed(2)}deg) rotateY(${springStyle.ry.toFixed(2)}deg)`,
            transition: 'transform 0.08s ease-out',
          }}
        >
          <div
            className="relative w-full"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* ================= FRONT FACE ================= */}
            <div
              className="relative w-full rounded-[20px] overflow-hidden bg-slate-950 border border-white/15 shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                boxShadow: `0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px -8px ${tier.glow}`,
              }}
            >
              {/* Dynamic Holographic Foil Overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  background: `
                    repeating-linear-gradient(
                      115deg,
                      transparent 0%,
                      rgba(220, 21, 60, 0.28) 12%,
                      rgba(245, 158, 11, 0.25) 24%,
                      rgba(6, 182, 212, 0.25) 36%,
                      rgba(220, 21, 60, 0.28) 48%,
                      transparent 60%
                    ),
                    radial-gradient(
                      circle at ${springStyle.px}% ${springStyle.py}%,
                      rgba(255, 255, 255, 0.45) 0%,
                      rgba(220, 21, 60, 0.25) 30%,
                      transparent 75%
                    )
                  `,
                  backgroundSize: '240% 240%, 100% 100%',
                  backgroundPosition: `${springStyle.px * 1.2}% ${springStyle.py * 1.2}%, center`,
                  mixBlendMode: 'color-dodge',
                  opacity: 0.22 + springStyle.hyp * 0.45,
                }}
              />

              {/* Specular glare */}
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  background: `radial-gradient(circle 340px at ${springStyle.px}% ${springStyle.py}%, rgba(255, 255, 255, 0.35) 0%, transparent 65%)`,
                  mixBlendMode: 'soft-light',
                }}
              />

              {/* Perforation Cutouts - Desktop: Vertical; Mobile: Horizontal */}
              {/* Desktop Perforations */}
              <div className="hidden md:block absolute -top-3.5 right-[29%] w-7 h-7 rounded-full bg-slate-950 border-b border-white/15 z-30 shadow-inner translate-x-1/2" />
              <div className="hidden md:block absolute -bottom-3.5 right-[29%] w-7 h-7 rounded-full bg-slate-950 border-t border-white/15 z-30 shadow-inner translate-x-1/2" />
              <div className="hidden md:block absolute top-4 bottom-4 right-[29%] w-px border-r-2 border-dashed border-white/20 z-25" />

              {/* Mobile Perforations */}
              <div className="md:hidden absolute top-[68%] -left-3.5 w-7 h-7 rounded-full bg-slate-950 border-r border-white/15 z-30 shadow-inner -translate-y-1/2" />
              <div className="md:hidden absolute top-[68%] -right-3.5 w-7 h-7 rounded-full bg-slate-950 border-l border-white/15 z-30 shadow-inner -translate-y-1/2" />
              <div className="md:hidden absolute left-4 right-4 top-[68%] h-px border-b-2 border-dashed border-white/20 z-25 -translate-y-1/2" />

              {/* Pass Body (Left: 71%, Right: 29% on desktop; vertical stack on mobile) */}
              <div className="relative z-10 flex flex-col md:flex-row min-h-[360px]">
                {/* Left: Main Event Body */}
                <div className="w-full md:w-[71%] p-5 sm:p-7 md:p-8 flex flex-col justify-between relative bg-gradient-to-br from-slate-900/95 via-slate-950 to-slate-900/95 backdrop-blur-md">
                  {/* Subtle Geometric Background */}
                  <div className="absolute inset-0 pointer-events-none opacity-5">
                    <svg className="w-full h-full" viewBox="0 0 600 400" fill="none">
                      <circle cx="300" cy="200" r="180" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
                      <circle cx="300" cy="200" r="120" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M50 350 L300 50 L550 350 Z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Top Row: Tier Badge + Security Seal */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${tier.badgeClasses}`}>
                          <Crown size={12} />
                          <span>{tier.badgeText}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:inline">
                          VERIFIED CREDENTIAL
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] sm:tracking-[0.2em] text-slate-400">
                        AFNO EVENTS • UK NEPALI FESTIVAL 2026
                      </p>
                    </div>

                    {/* Iridescent Hologram Seal */}
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] shadow-lg shrink-0" style={{ background: `conic-gradient(from 0deg, ${tier.accent1}, ${tier.accent2}, ${tier.accent3}, ${tier.accent1})` }}>
                      <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-center border border-white/20">
                        <ShieldCheck size={14} className="text-white mb-0.5" />
                        <span className="text-[7px] font-mono font-bold tracking-tighter text-white leading-none">AFNO</span>
                        <span className="text-[6px] font-mono text-alpine-400 leading-none mt-0.5">VERIFIED</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Title */}
                  <div className="my-4 sm:my-5 relative z-10">
                    <div className="text-xs font-mono font-bold tracking-widest text-alpine-400 uppercase mb-1 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      <span>OFFICIAL DIGITAL PASS</span>
                    </div>
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-white leading-none">
                      AFNO <span className="text-alpine-500">EVENTS</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 font-normal max-w-md">
                      Live Headline Concerts • Traditional Folk & Fusion • Nepalese Street Food & Cultural Village
                    </p>
                  </div>

                  {/* Bottom Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3.5 sm:pt-4 border-t border-white/10 relative z-10">
                    <div>
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">DATE</span>
                      <span className="block font-sans font-bold text-xs sm:text-sm text-white">28 NOV 2026</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">DOORS OPEN</span>
                      <span className="block font-sans font-bold text-xs sm:text-sm text-white">18:00 GMT</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">LOCATION</span>
                      <span className="block font-sans font-bold text-xs sm:text-sm text-white truncate">LONDON O2 ARENA</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">GATE / ZONE</span>
                      <span className={`block font-mono font-bold text-xs sm:text-sm ${tier.gateColor}`}>{tier.gate}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Tear-off Stub (Mobile: bottom section) */}
                <div className="w-full md:w-[29%] p-5 sm:p-6 bg-slate-900/95 flex flex-col justify-between items-center text-center relative border-t md:border-t-0 md:border-l border-white/10">
                  {/* Stub Header */}
                  <div className="w-full flex items-center justify-between md:justify-center md:flex-col gap-1 pb-2 border-b border-white/10">
                    <div className="text-left md:text-center">
                      <span className="block text-[9px] font-mono uppercase tracking-widest text-slate-400">SEAT / ADMIT</span>
                      <span className="font-sans font-black text-sm sm:text-base text-white">{tier.seat}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${tier.stubClasses}`}>
                      {tier.stubTag}
                    </span>
                  </div>

                  {/* High Density QR Code */}
                  <div className="my-3 p-2 rounded-xl bg-white shadow-xl group relative">
                    <svg
                      className="w-20 h-20 sm:w-24 sm:h-24 text-slate-950"
                      viewBox="0 0 29 29"
                      shapeRendering="crispEdges"
                      dangerouslySetInnerHTML={{ __html: qrCells }}
                    />
                  </div>

                  {/* Barcode & Serial */}
                  <div className="w-full">
                    <svg
                      className="w-full h-7 sm:h-8 text-white/90 mx-auto mb-1"
                      viewBox="0 0 220 40"
                      preserveAspectRatio="none"
                      shapeRendering="crispEdges"
                      dangerouslySetInnerHTML={{ __html: barcodeBars }}
                    />
                    <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-slate-400 px-0.5">
                      <span>{tier.serial}</span>
                      <span className="text-emerald-400">● VALID</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= BACK FACE ================= */}
            <div
              className="absolute inset-0 w-full h-full rounded-[20px] overflow-hidden bg-slate-950 border border-white/15 p-6 sm:p-8 flex flex-col justify-between"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                boxShadow: `0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px -8px ${tier.glow}`,
              }}
            >
              {/* Holographic foil sheen on back */}
              <div
                className="absolute inset-0 pointer-events-none z-20 opacity-25"
                style={{
                  background: `radial-gradient(circle at ${springStyle.px}% ${springStyle.py}%, rgba(220, 21, 60, 0.4) 0%, transparent 70%)`,
                }}
              />

              {/* Watermark text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <span className="font-sans font-black text-[120px] sm:text-[160px] tracking-tighter text-white">AFNO</span>
              </div>

              {/* Back Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-alpine-400" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm sm:text-base text-white tracking-wide">
                      PASS SPECIFICATIONS & ENTRY PROTOCOL
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400">CRYPTOGRAPHICALLY SIGNED • NON-DUPLICABLE</p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="block text-[9px] text-slate-400">PASS TIER</span>
                  <span className="text-xs font-bold text-alpine-400">{tier.price}</span>
                </div>
              </div>

              {/* Terms / Entitlements Grid */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 my-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="flex items-center gap-1.5 text-white font-semibold mb-1 text-xs">
                    <Crown size={13} className="text-alpine-400" />
                    <span>Tier Entitlements</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">{tier.perks}</p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="flex items-center gap-1.5 text-white font-semibold mb-1 text-xs">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span>Smart Gate Access</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Present this dynamic pass directly on your mobile device at turnstiles. Screen brightness automatically optimizes on tap.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="flex items-center gap-1.5 text-white font-semibold mb-1 text-xs">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Community Guarantee</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Protected by Afno Events zero-fee verified credential protocol. Non-transferable within 2 hours of gate opening.
                  </p>
                </div>
              </div>

              {/* Bottom Strip */}
              <div className="relative z-10 pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="w-full sm:w-2/3 h-6 rounded bg-slate-900 border border-white/10 flex items-center px-3 overflow-hidden">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-white/30 truncate">
                    &lt;&lt;AFNO2026&lt;&lt;LONDON&lt;&lt;VERIFIED&lt;&lt;{tier.serial}&lt;&lt;
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copySerial()
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : tier.serial}</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-500">SUPPORT@AFNOEVENTS.CO.UK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Link */}
      <div className="mt-4 flex items-center justify-center">
        <Link
          href="/app/events"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-alpine-500 hover:text-alpine-400 transition-colors"
        >
          <span>Explore All Confirmed Community Events</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MousePointer2, Pencil, Minus, ArrowRight, Square, StickyNote, Type,
  Trash2, ZoomIn, ZoomOut, Maximize2, Undo2, Redo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────

type Tool = 'select' | 'draw' | 'line' | 'arrow' | 'rect' | 'note' | 'text'

interface BaseShape {
  id: string
  type: string
  selected?: boolean
}
interface DrawShape extends BaseShape {
  type: 'draw'
  points: [number, number][]
  color: string
  width: number
}
interface LineShape extends BaseShape {
  type: 'line' | 'arrow'
  x1: number; y1: number; x2: number; y2: number
  color: string
  width: number
}
interface RectShape extends BaseShape {
  type: 'rect'
  x: number; y: number; w: number; h: number
  color: string
  fill: string
}
interface NoteShape extends BaseShape {
  type: 'note'
  x: number; y: number
  text: string
  color: string
}
interface TextShape extends BaseShape {
  type: 'text'
  x: number; y: number
  text: string
  color: string
}

type Shape = DrawShape | LineShape | RectShape | NoteShape | TextShape

const NOTE_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa']
const STROKE_COLORS = ['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']
const STROKE_WIDTHS = [1.5, 3, 5]
const NOTE_W = 160
const NOTE_H = 120

// ── Helpers ──────────────────────────────────────────────────────────

function uid() { return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number, vp: Viewport): [number, number] {
  const rect = svg.getBoundingClientRect()
  const cx = (clientX - rect.left - vp.x) / vp.zoom
  const cy = (clientY - rect.top - vp.y) / vp.zoom
  return [cx, cy]
}

function hitTest(shape: Shape, x: number, y: number): boolean {
  const PAD = 8
  if (shape.type === 'note') return x >= shape.x - PAD && x <= shape.x + NOTE_W + PAD && y >= shape.y - PAD && y <= shape.y + NOTE_H + PAD
  if (shape.type === 'text') return x >= shape.x - PAD && x <= shape.x + 200 && y >= shape.y - 20 && y <= shape.y + PAD
  if (shape.type === 'rect') return x >= shape.x - PAD && x <= shape.x + shape.w + PAD && y >= shape.y - PAD && y <= shape.y + shape.h + PAD
  if (shape.type === 'line' || shape.type === 'arrow') {
    const dx = shape.x2 - shape.x1, dy = shape.y2 - shape.y1
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return false
    const t = Math.max(0, Math.min(1, ((x - shape.x1) * dx + (y - shape.y1) * dy) / len2))
    const px = shape.x1 + t * dx - x, py = shape.y1 + t * dy - y
    return Math.sqrt(px * px + py * py) < 10
  }
  if (shape.type === 'draw') {
    return shape.points.some(([px, py]) => Math.abs(px - x) < 10 && Math.abs(py - y) < 10)
  }
  return false
}

interface Viewport { x: number; y: number; zoom: number }

// ── Main Component ───────────────────────────────────────────────────

interface NotesCanvasProps {
  documentId?: string
  exportRef?: React.MutableRefObject<(() => void) | null>
}

const SEED_SHAPES: Record<string, Shape[]> = {
  'doc-canvas-1': [
    { id: 'c1-n1', type: 'note', x: 60,  y: 60,  text: 'GP track record: 50+ yrs\n2x DPI on Fund VI', color: NOTE_COLORS[0] },
    { id: 'c1-n2', type: 'note', x: 280, y: 60,  text: 'Portfolio: 12 active\n3 upcoming exits',    color: NOTE_COLORS[2] },
    { id: 'c1-n3', type: 'note', x: 500, y: 60,  text: 'Strategy fit: ✓ Strong\nHealthcare mandate', color: NOTE_COLORS[4] },
    { id: 'c1-a1', type: 'arrow', x1: 220, y1: 100, x2: 278, y2: 100, color: '#1e293b', width: 1.5 },
    { id: 'c1-a2', type: 'arrow', x1: 440, y1: 100, x2: 498, y2: 100, color: '#1e293b', width: 1.5 },
    { id: 'c1-t1', type: 'text', x: 60,  y: 240, text: 'Deal Flow Diagram — Abingworth VIII', color: '#64748b' },
    { id: 'c1-r1', type: 'rect', x: 50,  y: 260, w: 620, h: 120, color: '#3b82f6', fill: 'rgba(59,130,246,0.05)' },
    { id: 'c1-n4', type: 'note', x: 70,  y: 275, text: 'Sourcing\nLP referral via Usman', color: NOTE_COLORS[5] },
    { id: 'c1-n5', type: 'note', x: 250, y: 275, text: 'Screening\nPassed — Mar 2026',   color: NOTE_COLORS[1] },
    { id: 'c1-n6', type: 'note', x: 430, y: 275, text: 'IC Review\nMeeting Apr 22',      color: NOTE_COLORS[3] },
  ],
  'doc-canvas-2': [
    { id: 'c2-t1', type: 'text', x: 60,  y: 50,  text: 'IC Prep — Key Questions', color: '#1e293b' },
    { id: 'c2-n1', type: 'note', x: 60,  y: 80,  text: 'Q: Concentration risk in biotech downturn?', color: NOTE_COLORS[3] },
    { id: 'c2-n2', type: 'note', x: 260, y: 80,  text: 'Q: Key-person dependency on CEO?',          color: NOTE_COLORS[3] },
    { id: 'c2-n3', type: 'note', x: 460, y: 80,  text: 'Q: FX exposure — EUR vs USD?',              color: NOTE_COLORS[3] },
    { id: 'c2-t2', type: 'text', x: 60,  y: 230, text: 'Supporting data points', color: '#1e293b' },
    { id: 'c2-n4', type: 'note', x: 60,  y: 260, text: 'IRR target 18–22%\nHistoric median: 19.4%', color: NOTE_COLORS[1] },
    { id: 'c2-n5', type: 'note', x: 260, y: 260, text: 'Fund size $450M\n↑ from $320M (Fund VII)',  color: NOTE_COLORS[2] },
    { id: 'c2-l1', type: 'line', x1: 60, y1: 248, x2: 640, y2: 248, color: '#94a3b8', width: 1 },
  ],
}

function loadShapes(documentId?: string): Shape[] {
  if (!documentId) return []
  try {
    const raw = localStorage.getItem(`canvas-${documentId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  // Return per-canvas seed shapes on first load
  return SEED_SHAPES[documentId] ?? []
}

export function NotesCanvas({ documentId, exportRef }: NotesCanvasProps) {
  const [shapes, setShapes] = useState<Shape[]>(() => loadShapes(documentId))
  const [history, setHistory] = useState<Shape[][]>([])
  const [future, setFuture] = useState<Shape[][]>([])

  const [tool, setTool] = useState<Tool>('select')
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0])
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTHS[0])
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0])

  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState<[number, number, number, number] | null>(null)

  // Drawing/dragging state
  const [drawing, setDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<Shape | null>(null)
  const [dragState, setDragState] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')

  // Wire export function to ref so parent can trigger it
  useEffect(() => {
    if (!exportRef) return
    exportRef.current = () => {
      const svg = svgRef.current
      if (!svg) return

      const rect = svg.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      const scale = 2

      // Serialize SVG, strip Tailwind classes, resolve currentColor to a safe fallback
      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute('width', String(W))
      clone.setAttribute('height', String(H))
      clone.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'))
      let svgStr = new XMLSerializer().serializeToString(clone)
      // currentColor can't cross the canvas security boundary — replace with a neutral dark
      svgStr = svgStr.replace(/currentColor/g, '#1e293b')

      const img = new Image()
      img.width = W
      img.height = H
      // Use a data URL instead of blob URL — avoids the tainted canvas restriction
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = W * scale
        canvas.height = H * scale
        const ctx = canvas.getContext('2d')!
        ctx.scale(scale, scale)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(img, 0, 0, W, H)
        const a = document.createElement('a')
        a.download = `${documentId ?? 'canvas'}.png`
        a.href = canvas.toDataURL('image/png')
        a.click()
      }
    }
  }, [exportRef, documentId])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleAutoSave = useCallback((next: Shape[]) => {
    if (!documentId) return
    setSaveStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`canvas-${documentId}`, JSON.stringify(next))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      } catch { setSaveStatus('idle') }
    }, 1000)
  }, [documentId])

  function commit(next: Shape[]) {
    setHistory(h => [...h.slice(-30), shapes])
    setFuture([])
    setShapes(next)
    scheduleAutoSave(next)
  }

  function undo() {
    if (!history.length) return
    setFuture(f => [shapes, ...f])
    setShapes(history[history.length - 1])
    setHistory(h => h.slice(0, -1))
  }

  function redo() {
    if (!future.length) return
    setHistory(h => [...h, shapes])
    setShapes(future[0])
    setFuture(f => f.slice(1))
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.shiftKey ? redo() : undo(); e.preventDefault() }
      if (e.key === 'Backspace' || e.key === 'Delete') deleteSelected()
      if (e.key === 'Escape') { setEditingId(null); setShapes(s => s.map(sh => ({ ...sh, selected: false }))) }
      if (e.key === 'v') setTool('select')
      if (e.key === 'p') setTool('draw')
      if (e.key === 'l') setTool('line')
      if (e.key === 'a') setTool('arrow')
      if (e.key === 'r') setTool('rect')
      if (e.key === 'n') setTool('note')
      if (e.key === 't') setTool('text')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shapes, history, future])

  function deleteSelected() {
    const next = shapes.filter(s => !s.selected)
    if (next.length < shapes.length) commit(next)
  }

  function getSVGPoint(e: React.MouseEvent | MouseEvent): [number, number] {
    if (!svgRef.current) return [0, 0]
    return svgPoint(svgRef.current, e.clientX, e.clientY, vp)
  }

  // ── Pointer down ──────────────────────────────────────────────────

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setPanning(true)
      setPanStart([e.clientX, e.clientY, vp.x, vp.y])
      return
    }
    if (e.button !== 0) return

    const [cx, cy] = getSVGPoint(e)

    if (tool === 'select') {
      // Hit test shapes in reverse (top-most first)
      const hit = [...shapes].reverse().find(s => hitTest(s, cx, cy))
      if (hit) {
        // Start drag
        const ox = cx - (hit.type === 'note' || hit.type === 'rect' || hit.type === 'text' ? (hit as NoteShape).x : (hit as LineShape).x1)
        const oy = cy - (hit.type === 'note' || hit.type === 'rect' || hit.type === 'text' ? (hit as NoteShape).y : (hit as LineShape).y1)
        setDragState({ id: hit.id, ox, oy })
        setShapes(s => s.map(sh => ({ ...sh, selected: sh.id === hit.id })))
      } else {
        setShapes(s => s.map(sh => ({ ...sh, selected: false })))
        setEditingId(null)
      }
      return
    }

    if (tool === 'note') {
      const id = uid()
      commit([...shapes, { id, type: 'note', x: cx - NOTE_W / 2, y: cy - NOTE_H / 2, text: '', color: noteColor }])
      setEditingId(id)
      setTool('select')
      return
    }

    if (tool === 'text') {
      const id = uid()
      commit([...shapes, { id, type: 'text', x: cx, y: cy, text: '', color: strokeColor }])
      setEditingId(id)
      setTool('select')
      return
    }

    if (tool === 'draw') {
      setDrawing(true)
      setCurrentShape({ id: uid(), type: 'draw', points: [[cx, cy]], color: strokeColor, width: strokeWidth })
      return
    }

    if (tool === 'line' || tool === 'arrow' || tool === 'rect') {
      setDrawing(true)
      if (tool === 'rect') {
        setCurrentShape({ id: uid(), type: 'rect', x: cx, y: cy, w: 0, h: 0, color: strokeColor, fill: 'transparent' })
      } else {
        setCurrentShape({ id: uid(), type: tool, x1: cx, y1: cy, x2: cx, y2: cy, color: strokeColor, width: strokeWidth })
      }
    }
  }

  // ── Pointer move ──────────────────────────────────────────────────

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (panning && panStart) {
      setVp(v => ({ ...v, x: panStart[2] + e.clientX - panStart[0], y: panStart[3] + e.clientY - panStart[1] }))
      return
    }

    const [cx, cy] = getSVGPoint(e)

    if (dragState) {
      setShapes(prev => prev.map(sh => {
        if (sh.id !== dragState.id) return sh
        if (sh.type === 'note' || sh.type === 'text') return { ...sh, x: cx - dragState.ox, y: cy - dragState.oy }
        if (sh.type === 'rect') return { ...sh, x: cx - dragState.ox, y: cy - dragState.oy }
        if (sh.type === 'line' || sh.type === 'arrow') {
          const dx = sh.x2 - sh.x1, dy = sh.y2 - sh.y1
          return { ...sh, x1: cx - dragState.ox, y1: cy - dragState.oy, x2: cx - dragState.ox + dx, y2: cy - dragState.oy + dy }
        }
        if (sh.type === 'draw') {
          const ox2 = sh.points[0][0] - dragState.ox
          const oy2 = sh.points[0][1] - dragState.oy
          return { ...sh, points: sh.points.map(([px, py]) => [px - ox2 + (cx - dragState.ox - sh.points[0][0] + ox2), py - oy2 + (cy - dragState.oy - sh.points[0][1] + oy2)] as [number, number]) }
        }
        return sh
      }))
      return
    }

    if (!drawing || !currentShape) return

    if (currentShape.type === 'draw') {
      setCurrentShape(s => s && s.type === 'draw' ? { ...s, points: [...s.points, [cx, cy]] } : s)
    } else if (currentShape.type === 'line' || currentShape.type === 'arrow') {
      setCurrentShape(s => s && (s.type === 'line' || s.type === 'arrow') ? { ...s, x2: cx, y2: cy } : s)
    } else if (currentShape.type === 'rect') {
      setCurrentShape(s => s && s.type === 'rect' ? { ...s, w: cx - s.x, h: cy - s.y } : s)
    }
  }

  // ── Pointer up ────────────────────────────────────────────────────

  function onCanvasMouseUp() {
    setPanning(false)
    setPanStart(null)

    if (dragState) {
      commit(shapes)
      setDragState(null)
      return
    }

    if (drawing && currentShape) {
      setDrawing(false)
      // Don't commit zero-size shapes
      const isZero = currentShape.type === 'rect'
        ? Math.abs(currentShape.w) < 3 && Math.abs(currentShape.h) < 3
        : currentShape.type === 'line' || currentShape.type === 'arrow'
        ? Math.abs(currentShape.x2 - currentShape.x1) < 3 && Math.abs(currentShape.y2 - currentShape.y1) < 3
        : currentShape.type === 'draw'
        ? currentShape.points.length < 2
        : false
      if (!isZero) commit([...shapes, currentShape])
      setCurrentShape(null)
    }
  }

  // ── Scroll to zoom ────────────────────────────────────────────────

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const rect = svgRef.current!.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    setVp(v => {
      const zoom = Math.max(0.2, Math.min(4, v.zoom * factor))
      return {
        zoom,
        x: cx - (cx - v.x) * (zoom / v.zoom),
        y: cy - (cy - v.y) * (zoom / v.zoom),
      }
    })
  }

  function resetZoom() { setVp({ x: 0, y: 0, zoom: 1 }) }

  // ── Render shapes ─────────────────────────────────────────────────

  function renderShape(shape: Shape) {
    const sel = shape.selected
    const selStroke = sel ? '#3b82f6' : 'none'
    const selSW = 2

    if (shape.type === 'draw') {
      const d = shape.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
      return (
        <g key={shape.id}>
          {sel && <path d={d} fill="none" stroke={selStroke} strokeWidth={shape.width + 6} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />}
          <path
            d={d}
            fill="none"
            stroke={shape.color}
            strokeWidth={shape.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="cursor-pointer"
            onMouseDown={(e) => { e.stopPropagation(); if (tool === 'select') { const [cx, cy] = getSVGPoint(e); const ox = cx - shape.points[0][0]; const oy = cy - shape.points[0][1]; setDragState({ id: shape.id, ox, oy }); setShapes(s => s.map(sh => ({ ...sh, selected: sh.id === shape.id }))) } }}
          />
        </g>
      )
    }

    if (shape.type === 'line' || shape.type === 'arrow') {
      const id = `arrow-${shape.id}`
      const dx = shape.x2 - shape.x1, dy = shape.y2 - shape.y1
      const len = Math.sqrt(dx * dx + dy * dy)
      const ex = len > 0 ? shape.x2 - (dx / len) * 10 : shape.x2
      const ey = len > 0 ? shape.y2 - (dy / len) * 10 : shape.y2
      return (
        <g key={shape.id}>
          <defs>
            <marker id={id} markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto">
              <path d="M 0 0 L 4 2 L 0 4" fill="none" stroke={shape.color} strokeWidth="1.2" />
            </marker>
          </defs>
          {sel && <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={selStroke} strokeWidth={shape.width + 6} strokeLinecap="round" opacity={0.3} />}
          <line
            x1={shape.x1} y1={shape.y1}
            x2={shape.type === 'arrow' ? ex : shape.x2}
            y2={shape.type === 'arrow' ? ey : shape.y2}
            stroke={shape.color}
            strokeWidth={shape.width}
            strokeLinecap="round"
            markerEnd={shape.type === 'arrow' ? `url(#${id})` : undefined}
            className="cursor-pointer"
            onMouseDown={(e) => { e.stopPropagation(); if (tool === 'select') { const [cx, cy] = getSVGPoint(e); setDragState({ id: shape.id, ox: cx - shape.x1, oy: cy - shape.y1 }); setShapes(s => s.map(sh => ({ ...sh, selected: sh.id === shape.id }))) } }}
          />
        </g>
      )
    }

    if (shape.type === 'rect') {
      const x = shape.w < 0 ? shape.x + shape.w : shape.x
      const y = shape.h < 0 ? shape.y + shape.h : shape.y
      const w = Math.abs(shape.w), h = Math.abs(shape.h)
      return (
        <g key={shape.id}>
          {sel && <rect x={x - selSW} y={y - selSW} width={w + selSW * 2} height={h + selSW * 2} rx={6} fill="none" stroke={selStroke} strokeWidth={selSW} strokeDasharray="4 2" />}
          <rect
            x={x} y={y} width={w} height={h} rx={4}
            fill={shape.fill}
            stroke={shape.color}
            strokeWidth={2}
            className="cursor-pointer"
            onMouseDown={(e) => { e.stopPropagation(); if (tool === 'select') { const [cx, cy] = getSVGPoint(e); setDragState({ id: shape.id, ox: cx - shape.x, oy: cy - shape.y }); setShapes(s => s.map(sh => ({ ...sh, selected: sh.id === shape.id }))) } }}
          />
        </g>
      )
    }

    if (shape.type === 'note') {
      return (
        <g key={shape.id} transform={`translate(${shape.x}, ${shape.y})`}>
          {sel && <rect x={-3} y={-3} width={NOTE_W + 6} height={NOTE_H + 6} rx={6} fill="none" stroke={selStroke} strokeWidth={selSW} strokeDasharray="4 2" />}
          <rect x={3} y={3} width={NOTE_W} height={NOTE_H} rx={4} fill="rgba(0,0,0,0.07)" />
          <rect
            width={NOTE_W} height={NOTE_H} rx={4}
            fill={shape.color}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth={1}
            className="cursor-move"
            onMouseDown={(e) => { e.stopPropagation(); if (tool === 'select') { const [cx, cy] = getSVGPoint(e); setDragState({ id: shape.id, ox: cx - shape.x, oy: cy - shape.y }); setShapes(s => s.map(sh => ({ ...sh, selected: sh.id === shape.id }))) } }}
          />
          {/* Top drag bar */}
          <rect
            width={NOTE_W} height={18} rx={4}
            fill="rgba(0,0,0,0.06)"
            className="cursor-move"
            onMouseDown={(e) => { e.stopPropagation(); if (tool === 'select') { const [cx, cy] = getSVGPoint(e); setDragState({ id: shape.id, ox: cx - shape.x, oy: cy - shape.y }); setShapes(s => s.map(sh => ({ ...sh, selected: sh.id === shape.id }))) } }}
          />
          {/* Delete on hover */}
          {sel && (
            <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); commit(shapes.filter(s => s.id !== shape.id)) }}>
              <circle cx={NOTE_W - 8} cy={8} r={7} fill="#ef4444" />
              <text x={NOTE_W - 8} y={12} textAnchor="middle" fontSize={10} fill="white" style={{ pointerEvents: 'none' }}>×</text>
            </g>
          )}
          <foreignObject x={6} y={20} width={NOTE_W - 12} height={NOTE_H - 26}>
            {editingId === shape.id ? (
              <textarea
                autoFocus
                value={shape.text}
                onChange={(e) => setShapes(s => s.map(sh => sh.id === shape.id ? { ...sh, text: e.target.value } as NoteShape : sh))}
                onBlur={() => { setEditingId(null); commit(shapes) }}
                className="w-full h-full resize-none bg-transparent text-[11px] text-gray-800 outline-none"
                style={{ fontFamily: 'inherit' }}
              />
            ) : (
              <div
                className="w-full h-full text-[11px] text-gray-800 cursor-text whitespace-pre-wrap break-words"
                style={{ fontFamily: 'inherit' }}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingId(shape.id) }}
              >
                {shape.text || <span className="text-gray-400 italic">Double-click to edit</span>}
              </div>
            )}
          </foreignObject>
        </g>
      )
    }

    if (shape.type === 'text') {
      return (
        <g key={shape.id}>
          {sel && <rect x={shape.x - 4} y={shape.y - 18} width={200} height={26} rx={3} fill="none" stroke={selStroke} strokeWidth={selSW} strokeDasharray="4 2" />}
          <foreignObject x={shape.x} y={shape.y - 16} width={300} height={40}>
            {editingId === shape.id ? (
              <input
                autoFocus
                value={shape.text}
                onChange={(e) => setShapes(s => s.map(sh => sh.id === shape.id ? { ...sh, text: e.target.value } as TextShape : sh))}
                onBlur={() => { setEditingId(null); commit(shapes) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { setEditingId(null); commit(shapes) } }}
                className="bg-transparent outline-none text-sm font-medium border-b border-primary w-full"
                style={{ color: shape.color, fontFamily: 'inherit' }}
              />
            ) : (
              <div
                className="text-sm font-medium cursor-move whitespace-nowrap"
                style={{ color: shape.color, fontFamily: 'inherit' }}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingId(shape.id) }}
                onMouseDown={(e) => { e.stopPropagation(); if (tool === 'select') { const [cx, cy] = getSVGPoint(e); setDragState({ id: shape.id, ox: cx - shape.x, oy: cy - shape.y }); setShapes(s => s.map(sh => ({ ...sh, selected: sh.id === shape.id }))) } }}
              >
                {shape.text || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Text</span>}
              </div>
            )}
          </foreignObject>
        </g>
      )
    }
  }

  const cursor =
    panning ? 'grabbing' :
    tool === 'select' ? 'default' :
    tool === 'draw' ? 'crosshair' :
    'crosshair'

  const selectedShape = shapes.find(s => s.selected)

  return (
    <div className="flex flex-col h-full select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b px-3 py-1.5 bg-background flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          {([
            ['select', MousePointer2, 'Select (V)'],
            ['draw', Pencil, 'Draw (P)'],
            ['line', Minus, 'Line (L)'],
            ['arrow', ArrowRight, 'Arrow (A)'],
            ['rect', Square, 'Rectangle (R)'],
            ['note', StickyNote, 'Note (N)'],
            ['text', Type, 'Text (T)'],
          ] as [Tool, React.ElementType, string][]).map(([t, Icon, title]) => (
            <button
              key={t}
              title={title}
              onClick={() => setTool(t)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                tool === t && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
              )}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>

        {/* Stroke color */}
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          {STROKE_COLORS.map(c => (
            <button
              key={c}
              title={c}
              onClick={() => setStrokeColor(c)}
              className={cn('h-4 w-4 rounded-full border-2 transition-transform', strokeColor === c ? 'border-foreground scale-125' : 'border-transparent')}
              style={{ background: c }}
            />
          ))}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={cn('h-6 w-6 flex items-center justify-center rounded hover:bg-accent', strokeWidth === w && 'bg-accent')}
              title={`Width ${w}`}
            >
              <div className="rounded-full bg-foreground" style={{ width: w * 3, height: w * 3 }} />
            </button>
          ))}
        </div>

        {/* Note color (shown when note tool active) */}
        {tool === 'note' && (
          <div className="flex items-center gap-1 border-r pr-2 mr-1">
            {NOTE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNoteColor(c)}
                className={cn('h-4 w-4 rounded border-2 transition-transform', noteColor === c ? 'border-foreground scale-125' : 'border-transparent')}
                style={{ background: c }}
              />
            ))}
          </div>
        )}

        {/* Delete selected */}
        {selectedShape && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={deleteSelected} title="Delete">
            <Trash2 className="size-3.5" />
          </Button>
        )}

        <div className="flex-1" />

        {/* Save status */}
        {documentId && saveStatus !== 'idle' && (
          <span className={cn('text-[11px] mr-1', saveStatus === 'saved' ? 'text-emerald-600' : 'text-muted-foreground')}>
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>
        )}

        {/* Undo/Redo */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={!history.length} title="Undo (⌘Z)">
          <Undo2 className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={!future.length} title="Redo (⌘⇧Z)">
          <Redo2 className="size-3.5" />
        </Button>

        {/* Zoom */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVp(v => ({ ...v, zoom: Math.min(4, v.zoom * 1.2) }))} title="Zoom in">
          <ZoomIn className="size-3.5" />
        </Button>
        <span className="text-[11px] text-muted-foreground w-10 text-center tabular-nums">{Math.round(vp.zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVp(v => ({ ...v, zoom: Math.max(0.2, v.zoom * 0.8) }))} title="Zoom out">
          <ZoomOut className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom} title="Reset view">
          <Maximize2 className="size-3.5" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden bg-muted/20 relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${vp.x}, ${vp.y}) scale(${vp.zoom})`}>
            {/* Dot grid */}
            <defs>
              <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="currentColor" className="text-muted-foreground/25" />
              </pattern>
              {/* Large area fill for infinite feel */}
            </defs>
            <rect x={-10000 / vp.zoom} y={-10000 / vp.zoom} width={30000 / vp.zoom} height={30000 / vp.zoom} fill="url(#dotgrid)" />

            {/* Committed shapes */}
            {shapes.map(renderShape)}

            {/* In-progress shape */}
            {currentShape && (() => {
              const s = currentShape
              if (s.type === 'draw') {
                const d = s.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
                return <path d={d} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />
              }
              if (s.type === 'line') return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={s.width} strokeLinecap="round" />
              if (s.type === 'arrow') {
                return (
                  <>
                    <defs>
                      <marker id="tmp-arrow" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto">
                        <path d="M 0 0 L 4 2 L 0 4" fill="none" stroke={s.color} strokeWidth="1.2" />
                      </marker>
                    </defs>
                    <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={s.width} strokeLinecap="round" markerEnd="url(#tmp-arrow)" />
                  </>
                )
              }
              if (s.type === 'rect') {
                const x = s.w < 0 ? s.x + s.w : s.x
                const y = s.h < 0 ? s.y + s.h : s.y
                return <rect x={x} y={y} width={Math.abs(s.w)} height={Math.abs(s.h)} rx={4} fill="transparent" stroke={s.color} strokeWidth={2} />
              }
              return null
            })()}
          </g>
        </svg>

        {/* Pan hint */}
        <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50 pointer-events-none">
          Scroll to zoom · Alt+drag or middle-click to pan
        </div>
      </div>
    </div>
  )
}

import { useState, useRef, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StickyNote {
  id: string
  x: number
  y: number
  text: string
  color: string
}

const NOTE_COLORS = [
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
]

export function NotesCanvas() {
  const [notes, setNotes] = useState<StickyNote[]>([
    { id: 'note-1', x: 40, y: 40, text: 'Key takeaways from LP meeting', color: NOTE_COLORS[0] },
    { id: 'note-2', x: 300, y: 80, text: 'Follow up on fee structure', color: NOTE_COLORS[2] },
  ])
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  function addNote() {
    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      x: 60 + Math.random() * 300,
      y: 60 + Math.random() * 200,
      text: '',
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
    }
    setNotes([...notes, newNote])
  }

  function deleteNote(id: string) {
    setNotes(notes.filter(n => n.id !== id))
  }

  function updateText(id: string, text: string) {
    setNotes(notes.map(n => n.id === id ? { ...n, text } : n))
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note || !svgRef.current) return
    const pt = svgRef.current.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse())
    setDragging({ id: noteId, offsetX: svgPt.x - note.x, offsetY: svgPt.y - note.y })
  }, [notes])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return
    const pt = svgRef.current.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse())
    setNotes(prev =>
      prev.map(n =>
        n.id === dragging.id
          ? { ...n, x: svgPt.x - dragging.offsetX, y: svgPt.y - dragging.offsetY }
          : n
      )
    )
  }, [dragging])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-medium">Notes Canvas</h3>
        <Button variant="outline" size="sm" onClick={addNote} className="gap-1.5">
          <Plus className="size-3.5" />
          Add Note
        </Button>
      </div>
      <div className="flex-1 bg-muted/20 overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid pattern */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/30" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {notes.map((note) => (
            <g key={note.id} transform={`translate(${note.x}, ${note.y})`}>
              {/* Shadow */}
              <rect
                x="2"
                y="2"
                width="160"
                height="120"
                rx="4"
                fill="rgba(0,0,0,0.08)"
              />
              {/* Note body */}
              <rect
                width="160"
                height="120"
                rx="4"
                fill={note.color}
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="1"
                className="cursor-move"
                onMouseDown={(e) => handleMouseDown(e, note.id)}
              />
              {/* Delete button area */}
              <g
                className="cursor-pointer opacity-0 hover:opacity-100"
                onClick={() => deleteNote(note.id)}
              >
                <circle cx="150" cy="10" r="8" fill="rgba(0,0,0,0.15)" />
                <text x="150" y="14" textAnchor="middle" fontSize="12" fill="#555">×</text>
              </g>
              {/* Text */}
              <foreignObject x="8" y="8" width="144" height="104">
                <textarea
                  value={note.text}
                  onChange={(e) => updateText(note.id, e.target.value)}
                  className="w-full h-full resize-none bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
                  placeholder="Type a note..."
                  style={{ fontFamily: 'inherit' }}
                />
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

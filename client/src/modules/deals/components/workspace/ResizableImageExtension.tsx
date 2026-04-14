import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react'

// ── Node Extension ──────────────────────────────────────────────────

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export const ResizableImage = Node.create({
  name: 'resizableImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      title: { default: '' },
      width: { default: null },
      alignment: { default: 'center' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-resizable-image]',
        getAttrs(dom: HTMLElement) {
          const img = dom.querySelector('img')
          return {
            src: img?.getAttribute('src'),
            alt: img?.getAttribute('alt') ?? '',
            title: dom.querySelector('figcaption')?.textContent ?? '',
            width: img?.getAttribute('width') ? Number(img.getAttribute('width')) : null,
            alignment: dom.getAttribute('data-alignment') ?? 'center',
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const { src, alt, title, width, alignment } = HTMLAttributes
    const imgAttrs: Record<string, string> = { src: src as string }
    if (alt) imgAttrs.alt = alt as string
    if (width) imgAttrs.width = String(width)

    return [
      'figure',
      { 'data-resizable-image': '', 'data-alignment': alignment, style: `text-align: ${alignment}` },
      ['img', imgAttrs],
      ...(title ? [['figcaption', {}, title as string]] : []),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },

  addCommands() {
    return {
      setResizableImage:
        (options: { src: string; alt?: string; title?: string; width?: number }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) => {
          return commands.insertContent({
            type: 'resizableImage',
            attrs: options,
          })
        },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  },
})

// ── React NodeView ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResizableImageView(props: any) {
  const { node, updateAttributes, deleteNode, selected, editor } = props
  const { src, alt, title, width, alignment } = node.attrs
  const isEditable = editor.isEditable

  const [isResizing, setIsResizing] = useState(false)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionValue, setCaptionValue] = useState(title ?? '')
  const imgRef = useRef<HTMLImageElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const resizeCornerRef = useRef<Corner>('bottom-right')

  // Sync caption if changed externally (undo/redo)
  useEffect(() => {
    setCaptionValue(title ?? '')
  }, [title])

  const handleResizeStart = useCallback(
    (corner: Corner, e: React.MouseEvent) => {
      if (!isEditable) return
      e.preventDefault()
      e.stopPropagation()
      resizeCornerRef.current = corner
      setIsResizing(true)
      startXRef.current = e.clientX
      startWidthRef.current = imgRef.current?.offsetWidth ?? 400
    },
    [isEditable],
  )

  useEffect(() => {
    if (!isResizing) return

    function handleMouseMove(e: MouseEvent) {
      const corner = resizeCornerRef.current
      const isLeftCorner = corner === 'top-left' || corner === 'bottom-left'
      const diff = isLeftCorner
        ? startXRef.current - e.clientX  // dragging left on a left corner → grows
        : e.clientX - startXRef.current  // dragging right on a right corner → grows
      const newWidth = Math.max(80, startWidthRef.current + diff)
      updateAttributes({ width: Math.round(newWidth) })
    }

    function handleMouseUp() {
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, updateAttributes])

  function handleCaptionBlur() {
    setEditingCaption(false)
    if (captionValue !== (title ?? '')) {
      updateAttributes({ title: captionValue })
    }
  }

  // Float styles for text wrapping
  const wrapperStyle: React.CSSProperties =
    alignment === 'left'
      ? { float: 'left', marginRight: '1rem', marginBottom: '0.5rem', clear: 'left' }
      : alignment === 'right'
        ? { float: 'right', marginLeft: '1rem', marginBottom: '0.5rem', clear: 'right' }
        : { float: 'none', clear: 'both' }

  const innerStyle: React.CSSProperties = {
    width: width ? `${width}px` : undefined,
    maxWidth: '100%',
    ...(alignment === 'center' ? { margin: '0 auto' } : {}),
  }

  return (
    <NodeViewWrapper className="my-2" style={wrapperStyle} data-drag-handle>
      <figure className="relative group" style={{ textAlign: alignment ?? 'center' }}>
        {/* Width-constrained wrapper — img + caption both live inside */}
        <div
          className={`relative inline-block ${selected ? 'ring-2 ring-primary ring-offset-2 rounded-md' : ''}`}
          style={innerStyle}
        >
          <img
            ref={imgRef}
            src={src}
            alt={alt ?? ''}
            className="block rounded-md"
            style={{ width: '100%', height: 'auto' }}
            draggable={false}
          />

          {/* Floating alignment toolbar on selection */}
          {selected && isEditable && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-lg border bg-background px-1 py-0.5 shadow-md z-10">
              <ImgToolbarBtn
                active={alignment === 'left'}
                onClick={() => updateAttributes({ alignment: 'left' })}
                title="Align left"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </ImgToolbarBtn>
              <ImgToolbarBtn
                active={alignment === 'center'}
                onClick={() => updateAttributes({ alignment: 'center' })}
                title="Align center"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </ImgToolbarBtn>
              <ImgToolbarBtn
                active={alignment === 'right'}
                onClick={() => updateAttributes({ alignment: 'right' })}
                title="Align right"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </ImgToolbarBtn>
              <div className="h-4 w-px bg-border mx-0.5" />
              <ImgToolbarBtn
                onClick={deleteNode}
                title="Remove image"
                destructive
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ImgToolbarBtn>
            </div>
          )}

          {/* Corner resize handles */}
          {isEditable && (
            <>
              <CornerHandle corner="top-left" selected={selected} onMouseDown={(e) => handleResizeStart('top-left', e)} />
              <CornerHandle corner="top-right" selected={selected} onMouseDown={(e) => handleResizeStart('top-right', e)} />
              <CornerHandle corner="bottom-left" selected={selected} onMouseDown={(e) => handleResizeStart('bottom-left', e)} />
              <CornerHandle corner="bottom-right" selected={selected} onMouseDown={(e) => handleResizeStart('bottom-right', e)} />
            </>
          )}

          {/* Caption / Description — inside the width wrapper so it matches image width */}
          {isEditable ? (
            editingCaption ? (
              <input
                type="text"
                value={captionValue}
                onChange={(e) => setCaptionValue(e.target.value)}
                onBlur={handleCaptionBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCaptionBlur()
                  if (e.key === 'Escape') {
                    setCaptionValue(title ?? '')
                    setEditingCaption(false)
                  }
                }}
                placeholder="Add a description..."
                className="mt-1.5 w-full text-center text-xs text-muted-foreground bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingCaption(true)}
                className="mt-1.5 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-text truncate"
              >
                {title || 'Click to add description...'}
              </button>
            )
          ) : title ? (
            <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">
              {title}
            </figcaption>
          ) : null}
        </div>
      </figure>
    </NodeViewWrapper>
  )
}

// ── Corner Handle ───────────────────────────────────────────────────

const cornerPositions: Record<Corner, string> = {
  'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
}

function CornerHandle({
  corner,
  selected,
  onMouseDown,
}: {
  corner: Corner
  selected: boolean
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={`absolute z-10 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm transition-opacity ${cornerPositions[corner]} ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      onMouseDown={onMouseDown}
    />
  )
}

// ── Floating Toolbar Button ─────────────────────────────────────────

function ImgToolbarBtn({
  active,
  onClick,
  title,
  children,
  destructive,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-6 w-6 items-center justify-center rounded transition-colors
        ${active ? 'bg-accent text-accent-foreground' : ''}
        ${destructive ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-accent hover:text-accent-foreground'}
      `}
    >
      {children}
    </button>
  )
}

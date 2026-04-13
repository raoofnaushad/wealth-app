import { useState, useRef, useEffect, useMemo } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/dist/types/excalidraw/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { dealsApi } from '../../api'
import type { Document, DocumentStatus } from '../../types'

interface CanvasPanelProps {
  document: Document
  opportunityId: string
  onUpdate: (doc: Document) => void
}

const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  in_review: { label: 'In Review', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  approved: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
}

export function CanvasPanel({ document, opportunityId, onUpdate }: CanvasPanelProps) {
  const [name, setName] = useState(document.name)
  const [editingName, setEditingName] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const status = statusConfig[document.status]
  const isReadOnly = document.status === 'approved'

  // Only parse initial data on mount — Excalidraw manages its own internal state
  const initialData = useMemo(() => {
    if (!document.content) return { elements: [], appState: {} }
    try {
      return JSON.parse(document.content)
    } catch {
      return { elements: [], appState: {} }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect theme from document root
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    globalThis.document?.documentElement?.classList.contains('dark') ? 'dark' : 'light',
  )

  useEffect(() => {
    const root = globalThis.document?.documentElement
    if (!root) return

    const observer = new MutationObserver(() => {
      setTheme(root.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  function handleChange(
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      // Only persist essential appState — the full object is huge and transient
      const sceneData = JSON.stringify({
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
        files,
      })
      setSaveStatus('saving')
      try {
        const updated = await dealsApi.updateDocument(opportunityId, document.id, {
          content: sceneData,
        })
        onUpdate(updated)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('idle')
      }
    }, 2000)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function handleNameSave() {
    setEditingName(false)
    if (name === document.name) return
    try {
      const updated = await dealsApi.updateDocument(opportunityId, document.id, { name })
      onUpdate(updated)
    } catch {
      setName(document.name)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header: name, status badge, save indicator */}
      <div className="flex items-center gap-3 px-4 py-2 border-b shrink-0">
        {editingName ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave()
              if (e.key === 'Escape') {
                setName(document.name)
                setEditingName(false)
              }
            }}
            className="h-8 text-base font-semibold max-w-xs"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              if (!isReadOnly) setEditingName(true)
            }}
            className={cn(
              'text-base font-semibold truncate text-left',
              !isReadOnly && 'hover:underline cursor-pointer',
            )}
            title={isReadOnly ? document.name : 'Click to rename'}
          >
            {document.name}
          </button>
        )}

        <Badge variant="secondary" className={cn('shrink-0', status.className)}>
          {status.label}
        </Badge>

        {saveStatus === 'saving' && (
          <span className="text-xs text-muted-foreground ml-auto">Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-xs text-emerald-600 ml-auto">Saved</span>
        )}
      </div>

      {/* Canvas: fills remaining space */}
      <div className="flex-1 relative">
        <Excalidraw
          initialData={initialData}
          onChange={handleChange}
          viewModeEnabled={isReadOnly}
          theme={theme}
        />
      </div>
    </div>
  )
}

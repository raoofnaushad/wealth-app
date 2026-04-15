import { useState, useRef, useCallback, useEffect, type ChangeEvent } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { ResizableImage } from './ResizableImageExtension'
import { FontSize, FONT_SIZES } from './FontSizeExtension'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  Upload,
  Link2,
  Code,
  ImagePlus,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { dealsApi } from '../../api'
import { useUndoRedo } from './useUndoRedo'
import type { Document, DocumentStatus } from '../../types'
import type { Editor } from '@tiptap/react'

interface DocumentPanelProps {
  document: Document
  opportunityId: string
  onUpdate: (doc: Document) => void
  onEditorReady?: (editor: Editor | null) => void
}

const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  in_review: { label: 'In Review', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  approved: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-7 w-7', active && 'bg-accent text-accent-foreground')}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      {children}
    </Button>
  )
}

function ToolbarSeparator() {
  return <div className="h-5 w-px bg-border mx-1" />
}

// ── Font Size Dropdown ──────────────────────────────────────────────

function FontSizeSelect({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const currentSize = editor.getAttributes('textStyle')?.fontSize ?? ''
  const displaySize = currentSize ? currentSize.replace('px', '') : '—'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium tabular-nums min-w-[3rem]',
          disabled
            ? 'opacity-50 pointer-events-none'
            : 'hover:bg-accent hover:text-accent-foreground cursor-pointer text-muted-foreground',
        )}
        title="Font size"
      >
        {displaySize}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto min-w-[4rem]">
        <DropdownMenuItem
          onClick={() => (editor.chain().focus() as any).unsetFontSize().run()}
          className="text-xs"
        >
          Default
        </DropdownMenuItem>
        {FONT_SIZES.map(({ label, value }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => (editor.chain().focus() as any).setFontSize(value).run()}
            className={cn('text-xs', currentSize === value && 'bg-accent text-accent-foreground')}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Editor Toolbar ──────────────────────────────────────────────────

interface EditorToolbarProps {
  editor: Editor | null
  disabled: boolean
}

function EditorToolbar({ editor, disabled }: EditorToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      ;(editor.chain().focus() as any).setResizableImage({ src: dataUrl }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (!editor) return null

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b flex-wrap">
      {/* Font size */}
      <FontSizeSelect editor={editor} disabled={disabled} />

      <ToolbarSeparator />

      {/* Text formatting */}
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Headings */}
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        active={editor.isActive('heading', { level: 4 })}
        title="Heading 4"
      >
        <Heading4 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Block elements */}
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Alignment */}
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Image */}
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={handleImageUpload}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="Insert Image"
        >
          <ImageIcon className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload from computer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            const url = window.prompt('Image URL:')
            if (url) {
              ;(editor.chain().focus() as any).setResizableImage({ src: url }).run()
            }
          }}>
            <Link2 className="h-4 w-4 mr-2" />
            Insert from URL
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />

      {/* Code */}
      <ToolbarButton disabled={disabled}
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

// ── Logo Upload ─────────────────────────────────────────────────────

function LogoUpload({
  logoUrl,
  onLogoChange,
  disabled,
}: {
  logoUrl: string | null
  onLogoChange: (url: string | null) => void
  disabled: boolean
}) {
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onLogoChange(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (logoUrl) {
    return (
      <div className="relative group shrink-0">
        <img
          src={logoUrl}
          alt="Document logo"
          className="h-10 max-w-[120px] object-contain rounded"
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => onLogoChange(null)}
            className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove logo"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    )
  }

  if (disabled) return null

  return (
    <>
      <input
        ref={logoInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleLogoUpload}
      />
      <button
        type="button"
        onClick={() => logoInputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
        title="Add logo — appears on downloaded documents"
      >
        <ImagePlus className="h-3.5 w-3.5" />
        Add Logo
      </button>
    </>
  )
}

// ── Main Component ──────────────────────────────────────────────────

export function DocumentPanel({ document, opportunityId, onUpdate, onEditorReady }: DocumentPanelProps) {
  const [name, setName] = useState(document.name)
  const [editingName, setEditingName] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef(document.content ?? '')
  const { pushChange } = useUndoRedo()

  const status = statusConfig[document.status]
  const isReadOnly = document.status === 'approved'

  // Persist logo in localStorage keyed by document ID
  useEffect(() => {
    const saved = localStorage.getItem(`doc-logo-${document.id}`)
    if (saved) setLogoUrl(saved)
  }, [document.id])

  function handleLogoChange(url: string | null) {
    setLogoUrl(url)
    if (url) {
      localStorage.setItem(`doc-logo-${document.id}`, url)
    } else {
      localStorage.removeItem(`doc-logo-${document.id}`)
    }
  }

  const saveContent = useCallback(
    async (newContent: string) => {
      setSaveStatus('saving')
      try {
        const updated = await dealsApi.updateDocument(opportunityId, document.id, {
          content: newContent,
        })
        onUpdate(updated)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('idle')
      }
    },
    [opportunityId, document.id, onUpdate],
  )

  const handleContentChange = useCallback(
    (newContent: string) => {
      const previousContent = contentRef.current
      if (previousContent === newContent) return

      pushChange({
        type: 'document_content',
        targetId: document.id,
        previousValue: previousContent,
        newValue: newContent,
      })

      contentRef.current = newContent

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        saveContent(newContent)
      }, 2000)
    },
    [document.id, pushChange, saveContent],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ResizableImage,
      Placeholder.configure({ placeholder: 'Start writing document content...' }),
    ],
    content: document.content ?? '',
    editable: !isReadOnly,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      handleContentChange(html)
    },
  })

  // Notify parent when editor is ready or destroyed
  useEffect(() => {
    onEditorReady?.(editor)
    return () => onEditorReady?.(null)
  }, [editor, onEditorReady])

  // Sync editor content when document prop changes (e.g., from undo/redo)
  useEffect(() => {
    if (editor && document.content !== editor.getHTML()) {
      editor.commands.setContent(document.content ?? '')
      contentRef.current = document.content ?? ''
    }
  }, [document.content, editor])

  // Sync editable state when document status changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly)
    }
  }, [isReadOnly, editor])

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
      {/* Document header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        {editingName ? (
          <Input
            ref={nameInputRef}
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
          <span className="text-xs text-muted-foreground ml-auto mr-3">Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-xs text-emerald-600 ml-auto mr-3">Saved</span>
        )}
        {saveStatus === 'idle' && <div className="ml-auto" />}

        {/* Logo — right side of header */}
        <LogoUpload
          logoUrl={logoUrl}
          onLogoChange={handleLogoChange}
          disabled={isReadOnly}
        />
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} disabled={isReadOnly} />

      {/* Editor content */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <EditorContent
          editor={editor}
          className="h-full [&_.tiptap]:p-4 [&_.tiptap]:min-h-full"
        />
      </div>
    </div>
  )
}

/** Expose the logo URL getter for download functions */
export function getDocumentLogoUrl(documentId: string): string | null {
  return localStorage.getItem(`doc-logo-${documentId}`)
}

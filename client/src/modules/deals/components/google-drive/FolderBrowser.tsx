import { useEffect, useState, useCallback } from 'react'
import { FolderOpen, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dealsApi } from '../../api'
import type { DriveFolder } from '../../types'

interface FolderBrowserProps {
  accountId: string
  selectedFolderIds: string[]
  onSelectionChange: (ids: string[]) => void
}

interface FolderNode extends DriveFolder {
  children: FolderNode[]
  loaded: boolean
  expanded: boolean
}

export function FolderBrowser({ accountId, selectedFolderIds, onSelectionChange }: FolderBrowserProps) {
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const result = await dealsApi.browseGoogleDrive(accountId)
        if (!cancelled) {
          setFolders(
            result.folders.map((f) => ({
              ...f,
              children: [],
              loaded: false,
              expanded: false,
            }))
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [accountId])

  const toggleExpand = useCallback(async (folderId: string) => {
    setFolders((prev) => {
      function toggle(nodes: FolderNode[]): FolderNode[] {
        return nodes.map((node) => {
          if (node.id === folderId) {
            return { ...node, expanded: !node.expanded }
          }
          return { ...node, children: toggle(node.children) }
        })
      }
      return toggle(prev)
    })

    // Load children if not yet loaded
    setFolders((prev) => {
      function findNode(nodes: FolderNode[]): FolderNode | null {
        for (const n of nodes) {
          if (n.id === folderId) return n
          const found = findNode(n.children)
          if (found) return found
        }
        return null
      }
      const node = findNode(prev)
      if (node && !node.loaded && node.hasChildren) {
        // Trigger async load
        dealsApi.browseGoogleDrive(accountId, folderId).then((result) => {
          setFolders((current) => {
            function updateNode(nodes: FolderNode[]): FolderNode[] {
              return nodes.map((n) => {
                if (n.id === folderId) {
                  return {
                    ...n,
                    loaded: true,
                    children: result.folders.map((f) => ({
                      ...f,
                      children: [],
                      loaded: false,
                      expanded: false,
                    })),
                  }
                }
                return { ...n, children: updateNode(n.children) }
              })
            }
            return updateNode(current)
          })
        })
      }
      return prev
    })
  }, [accountId])

  const toggleSelect = useCallback((folderId: string) => {
    if (selectedFolderIds.includes(folderId)) {
      onSelectionChange(selectedFolderIds.filter((id) => id !== folderId))
    } else {
      onSelectionChange([...selectedFolderIds, folderId])
    }
  }, [selectedFolderIds, onSelectionChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading folders...
      </div>
    )
  }

  if (folders.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No folders found in this Google Drive account.
      </div>
    )
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-md border">
      <FolderList
        folders={folders}
        depth={0}
        selectedFolderIds={selectedFolderIds}
        onToggleExpand={toggleExpand}
        onToggleSelect={toggleSelect}
      />
    </div>
  )
}

function FolderList({
  folders,
  depth,
  selectedFolderIds,
  onToggleExpand,
  onToggleSelect,
}: {
  folders: FolderNode[]
  depth: number
  selectedFolderIds: string[]
  onToggleExpand: (id: string) => void
  onToggleSelect: (id: string) => void
}) {
  return (
    <div>
      {folders.map((folder) => (
        <div key={folder.id}>
          <div
            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            {folder.hasChildren ? (
              <button
                type="button"
                onClick={() => onToggleExpand(folder.id)}
                className="shrink-0 rounded p-0.5 hover:bg-muted"
              >
                <ChevronRight
                  className={cn(
                    'size-3.5 transition-transform',
                    folder.expanded && 'rotate-90'
                  )}
                />
              </button>
            ) : (
              <span className="w-4.5 shrink-0" />
            )}
            <input
              type="checkbox"
              checked={selectedFolderIds.includes(folder.id)}
              onChange={() => onToggleSelect(folder.id)}
              className="size-3.5 shrink-0 rounded border-input"
            />
            <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{folder.name}</span>
          </div>
          {folder.expanded && folder.children.length > 0 && (
            <FolderList
              folders={folder.children}
              depth={depth + 1}
              selectedFolderIds={selectedFolderIds}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
            />
          )}
        </div>
      ))}
    </div>
  )
}

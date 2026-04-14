import { Check, Download, File, FileSpreadsheet, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SourceFile } from '../../types'

interface SourceFileViewerProps {
  sourceFile: SourceFile
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getFileCategory(fileType: string | null, fileName: string): 'pdf' | 'image' | 'spreadsheet' | 'document' | 'other' {
  const type = fileType?.toLowerCase() ?? ''
  const name = fileName.toLowerCase()
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (type.includes('image') || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(name)) return 'image'
  if (type.includes('spreadsheet') || type.includes('excel') || /\.(xlsx?|csv)$/.test(name)) return 'spreadsheet'
  if (type.includes('word') || type.includes('document') || /\.(docx?|rtf)$/.test(name)) return 'document'
  return 'other'
}

function FileIcon({ category }: { category: ReturnType<typeof getFileCategory> }) {
  switch (category) {
    case 'pdf': return <FileText className="h-5 w-5 text-red-500 shrink-0" />
    case 'spreadsheet': return <FileSpreadsheet className="h-5 w-5 text-green-600 shrink-0" />
    case 'document': return <FileText className="h-5 w-5 text-blue-500 shrink-0" />
    case 'image': return <File className="h-5 w-5 text-purple-500 shrink-0" />
    default: return <File className="h-5 w-5 text-muted-foreground shrink-0" />
  }
}

function LargeFileIcon({ category }: { category: ReturnType<typeof getFileCategory> }) {
  switch (category) {
    case 'spreadsheet': return <FileSpreadsheet className="h-16 w-16 text-green-600" />
    case 'document': return <FileText className="h-16 w-16 text-blue-500" />
    default: return <File className="h-16 w-16 text-muted-foreground" />
  }
}

export function SourceFileViewer({ sourceFile }: SourceFileViewerProps) {
  const { fileName, fileUrl, fileType, fileSize, processed, createdAt } = sourceFile
  const category = getFileCategory(fileType, fileName)

  const fileTypeLabel = fileType
    ? fileType.toUpperCase().replace('APPLICATION/', '').replace('IMAGE/', '').split('.').pop() ?? 'File'
    : 'File'

  function handleDownload() {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    a.click()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <FileIcon category={category} />
          <span className="text-base font-semibold truncate">{fileName}</span>
        </div>

        <p className="text-sm text-muted-foreground">
          {fileTypeLabel} &bull; {formatFileSize(fileSize)} &bull; Uploaded {formatDate(createdAt)}
        </p>

        <div className="flex items-center gap-2">
          {processed ? (
            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
              <Check className="h-3 w-3 mr-1" />
              Processed
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
              Pending
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Viewer */}
      {category === 'pdf' ? (
        <div className="flex-1 overflow-hidden">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={fileName}
          />
        </div>
      ) : category === 'image' ? (
        <div className="flex-1 overflow-hidden p-4 flex items-center justify-center">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-8">
          <LargeFileIcon category={category} />
          <div className="space-y-1">
            <p className="text-base font-medium">{fileName}</p>
            <p className="text-sm text-muted-foreground">
              {category === 'spreadsheet'
                ? 'Spreadsheet files cannot be previewed in the browser.'
                : category === 'document'
                  ? 'Word documents cannot be previewed in the browser.'
                  : 'This file type cannot be previewed in the browser.'}
            </p>
          </div>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download to View
          </Button>
        </div>
      )}
    </div>
  )
}

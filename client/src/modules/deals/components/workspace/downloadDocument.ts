import type { Document } from '../../types'

/**
 * Download document content as a styled HTML file
 */
export function downloadAsHTML(doc: Document, opportunityName: string): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.name)}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 16px; }
    .content { white-space: pre-wrap; font-size: 15px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(doc.name)}</h1>
  <div class="meta">
    <p>Opportunity: ${escapeHtml(opportunityName)} &bull; Date: ${new Date().toLocaleDateString()} &bull; Status: ${doc.status}</p>
  </div>
  <div class="content">${escapeHtml(doc.content ?? '')}</div>
</body>
</html>`

  downloadBlob(html, `${sanitizeFilename(doc.name)}.html`, 'text/html')
}

/**
 * Download document content as plain text
 */
export function downloadAsText(doc: Document): void {
  const text = `${doc.name}\n${'='.repeat(doc.name.length)}\n\n${doc.content ?? ''}`
  downloadBlob(text, `${sanitizeFilename(doc.name)}.txt`, 'text/plain')
}

// Helper: create blob and trigger download
function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper: escape HTML entities
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Helper: sanitize filename
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_')
}

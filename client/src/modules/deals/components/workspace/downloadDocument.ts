import type { Document } from '../../types'
import { getDocumentLogoUrl } from './DocumentPanel'

// ── Shared: render the editor as a screenshot ───────────────────────
//
// Clones the live .tiptap editor, wraps it with a document header
// (title, meta, logo) and footer, then captures with html2canvas.
// Used by PDF export for pixel-perfect output.

async function renderEditorScreenshot(
  doc: Document,
  opportunityName: string,
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas-pro')).default
  const logoUrl = getDocumentLogoUrl(doc.id)
  const date = formatDate()

  // Find the live tiptap editor element
  const liveEditor = window.document.querySelector('.tiptap') as HTMLElement | null
  if (!liveEditor) throw new Error('Editor element not found')

  // Build an off-screen wrapper: header + cloned editor + footer.
  // box-sizing: border-box so width: 860px is the TOTAL width (content area = 860 - 80 = 780px).
  const wrapper = window.document.createElement('div')
  wrapper.style.cssText = `
    position: fixed; left: -10000px; top: 0;
    width: 860px; padding: 40px 40px 30px; box-sizing: border-box; background: white;
    font-family: ${getComputedStyle(liveEditor).fontFamily};
    color: #1a1a2e; line-height: 1.65; overflow: hidden;
  `

  // ── Header (display:table for html2canvas compatibility)
  const header = window.document.createElement('div')
  header.style.cssText = 'display:table;width:100%;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #1a1a2e;'

  const headerLeft = window.document.createElement('div')
  headerLeft.style.cssText = 'display:table-cell;vertical-align:top;'
  headerLeft.innerHTML = `
    <div style="font-size:20px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">${escapeHtml(doc.name)}</div>
    <div style="font-size:11px;color:#6b7280;">
      <span style="margin-right:14px;"><b>Opportunity:</b> ${escapeHtml(opportunityName)}</span>
      <span style="margin-right:14px;"><b>Date:</b> ${date}</span>
      <span><b>Status:</b> ${capitalize(doc.status.replace('_', ' '))}</span>
    </div>
  `
  header.appendChild(headerLeft)

  if (logoUrl) {
    const headerRight = window.document.createElement('div')
    headerRight.style.cssText = 'display:table-cell;vertical-align:top;text-align:right;width:160px;'
    const logoImg = window.document.createElement('img')
    logoImg.src = logoUrl
    logoImg.style.cssText = 'max-height:44px;max-width:150px;'
    await new Promise<void>((resolve) => {
      if (logoImg.complete && logoImg.naturalWidth > 0) return resolve()
      logoImg.onload = () => resolve()
      logoImg.onerror = () => resolve()
      setTimeout(resolve, 3000)
    })
    headerRight.appendChild(logoImg)
    header.appendChild(headerRight)
  }

  wrapper.appendChild(header)

  // ── Editor content: deep clone the live editor
  const editorClone = liveEditor.cloneNode(true) as HTMLElement
  editorClone.style.outline = 'none'
  editorClone.style.padding = '0'
  editorClone.style.minHeight = 'auto'
  editorClone.style.maxWidth = '100%'

  // Replace each TipTap NodeViewWrapper (resizable image) with a clean <figure>
  // so that selection handles, floating toolbars, resize handles, and caption
  // buttons are stripped — only the img + optional figcaption survive.
  editorClone.querySelectorAll('[data-node-view-wrapper]').forEach((nodeWrapper) => {
    const srcImg = nodeWrapper.querySelector('img')
    if (!srcImg) { nodeWrapper.remove(); return }
    // In editable mode TipTap renders the caption as a <button>; in read-only as <figcaption>.
    const captionRaw =
      nodeWrapper.querySelector('figcaption')?.textContent?.trim() ??
      nodeWrapper.querySelector('button[type="button"]')?.textContent?.trim()
    const captionText = captionRaw && captionRaw !== 'Click to add description...' ? captionRaw : undefined
    const alignment = (nodeWrapper.querySelector('figure') as HTMLElement | null)
      ?.getAttribute('data-alignment') ?? 'center'

    const cleanFig = window.document.createElement('figure')
    cleanFig.style.cssText = `margin: 0.75rem 0; text-align: ${alignment};`

    const cleanImg = srcImg.cloneNode(true) as HTMLImageElement
    cleanImg.style.cssText = `max-width: 100%; height: auto; display: inline-block; border-radius: 6px;`
    if (alignment === 'center') cleanImg.style.margin = '0 auto'
    cleanFig.appendChild(cleanImg)

    if (captionText) {
      const cap = window.document.createElement('figcaption')
      cap.textContent = captionText
      cap.style.cssText = 'font-size: 11px; color: #6b7280; text-align: center; margin-top: 4px; font-style: italic;'
      cleanFig.appendChild(cap)
    }

    nodeWrapper.parentNode?.replaceChild(cleanFig, nodeWrapper)
  })

  copyComputedStyles(liveEditor, editorClone)
  wrapper.appendChild(editorClone)

  // ── Footer
  const footer = window.document.createElement('div')
  footer.style.cssText = 'margin-top:30px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center;'
  footer.textContent = `Generated by Invictus AI \u2022 ${date}`
  wrapper.appendChild(footer)

  window.document.body.appendChild(wrapper)

  // Wait for all cloned images to load
  const imgs = wrapper.querySelectorAll('img')
  await Promise.all(
    Array.from(imgs).map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r() })
    ),
  )
  await sleep(100)

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    })
    return canvas
  } finally {
    window.document.body.removeChild(wrapper)
  }
}

// Copy computed styles from source to target recursively
function copyComputedStyles(source: HTMLElement, target: HTMLElement) {
  const props = [
    'font-family', 'font-size', 'font-weight', 'font-style',
    'color', 'text-decoration', 'text-align', 'line-height',
    'letter-spacing', 'white-space',
    'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
    'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
    'border-left', 'border-right', 'border-top', 'border-bottom',
    'background-color', 'list-style-type',
    'float', 'clear', 'display',
    // width/max-width intentionally excluded: computed values from the live editor
    // (e.g. 820px) would overflow the 780px capture area and clip text on the right.
    // Block elements fill their parent naturally without explicit widths.
  ]

  const srcChildren = source.children
  const tgtChildren = target.children
  const len = Math.min(srcChildren.length, tgtChildren.length)

  for (let i = 0; i < len; i++) {
    const sc = srcChildren[i] as HTMLElement
    const tc = tgtChildren[i] as HTMLElement
    if (!sc || !tc) continue
    const computed = getComputedStyle(sc)
    for (const prop of props) {
      try { tc.style.setProperty(prop, computed.getPropertyValue(prop)) } catch { /* skip */ }
    }
    if (sc.children.length > 0) copyComputedStyles(sc, tc)
  }
}

// ── PDF Export ───────────────────────────────────────────────────────

export async function downloadAsPDF(doc: Document, opportunityName: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const canvas = await renderEditorScreenshot(doc, opportunityName)

  const imgData = canvas.toDataURL('image/png')
  const pdfW = 210 // A4 mm
  const pdfH = 297
  const margin = 10
  const contentW = pdfW - margin * 2
  const ratio = canvas.height / canvas.width
  const imgW = contentW
  const imgH = imgW * ratio

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageH = pdfH - margin * 2

  if (imgH <= pageH) {
    pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH)
  } else {
    let pos = 0
    let page = 0
    while (pos < imgH) {
      if (page > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', margin, margin - pos, imgW, imgH)
      pos += pageH
      page++
    }
  }

  pdf.save(`${sanitizeFilename(doc.name)}.pdf`)
}

// ── DOCX Export (proper text + images) ──────────────────────────────

export async function downloadAsDocx(doc: Document, opportunityName: string): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
    UnderlineType,
    LevelFormat,
  } = await import('docx')
  const { saveAs } = await import('file-saver')

  const date = formatDate()

  // Parse the editor HTML into docx paragraphs
  const html = doc.content ?? ''
  const bodyParagraphs = await convertHtmlToDocx(html, {
    Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, BorderStyle, UnderlineType,
  })

  const file = new Document({
    numbering: {
      config: [
        {
          reference: 'bullet-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: 'decimal-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children: [
          // ── Document header
          new Paragraph({
            children: [new TextRun({ text: doc.name, bold: true, size: 40 })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Opportunity: ${opportunityName}  \u2022  Date: ${date}  \u2022  Status: ${capitalize(doc.status.replace('_', ' '))}`,
                size: 18,
                color: '6b7280',
              }),
            ],
            spacing: { after: 160 },
          }),
          new Paragraph({
            children: [],
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a1a2e' } },
            spacing: { after: 240 },
          }),
          // ── Body content
          ...bodyParagraphs,
          // ── Footer
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated by Invictus AI \u2022 ${date}`,
                size: 16,
                color: '9ca3af',
              }),
            ],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'e5e7eb' } },
            spacing: { before: 400 },
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(file)
  saveAs(blob, `${sanitizeFilename(doc.name)}.docx`)
}

// ── HTML → docx converter ────────────────────────────────────────────

type DocxDeps = {
  Paragraph: typeof import('docx').Paragraph
  TextRun: typeof import('docx').TextRun
  ImageRun: typeof import('docx').ImageRun
  HeadingLevel: typeof import('docx').HeadingLevel
  AlignmentType: typeof import('docx').AlignmentType
  BorderStyle: typeof import('docx').BorderStyle
  UnderlineType: typeof import('docx').UnderlineType
}

type DocxChild = InstanceType<typeof import('docx').Paragraph>

async function convertHtmlToDocx(html: string, deps: DocxDeps): Promise<DocxChild[]> {
  const { Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } = deps

  if (!html.trim()) return []

  const parser = new DOMParser()
  const dom = parser.parseFromString(html, 'text/html')
  const result: DocxChild[] = []

  for (const node of Array.from(dom.body.childNodes)) {
    const el = node as HTMLElement
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) result.push(new Paragraph({ children: [new TextRun(text)] }))
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue

    const tag = el.tagName?.toLowerCase()

    // Headings
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      const levelMap = {
        h1: HeadingLevel.HEADING_1,
        h2: HeadingLevel.HEADING_2,
        h3: HeadingLevel.HEADING_3,
        h4: HeadingLevel.HEADING_4,
      }
      result.push(
        new Paragraph({
          heading: levelMap[tag as keyof typeof levelMap],
          children: inlineToRuns(el, deps),
          alignment: getAlignment(el, AlignmentType),
          spacing: { before: 200, after: 100 },
        }),
      )
      continue
    }

    // Paragraph
    if (tag === 'p') {
      const runs = inlineToRuns(el, deps)
      if (runs.length === 0) {
        result.push(new Paragraph({ children: [], spacing: { after: 120 } }))
      } else {
        result.push(
          new Paragraph({
            children: runs,
            alignment: getAlignment(el, AlignmentType),
            spacing: { after: 120 },
          }),
        )
      }
      continue
    }

    // Blockquote
    if (tag === 'blockquote') {
      for (const child of Array.from(el.childNodes)) {
        const cEl = child as HTMLElement
        if (child.nodeType !== Node.ELEMENT_NODE) continue
        result.push(
          new Paragraph({
            children: inlineToRuns(cEl, deps),
            indent: { left: 720 },
            spacing: { after: 120 },
            border: { left: { style: deps.BorderStyle.SINGLE, size: 12, color: 'a0aec0', space: 4 } },
          }),
        )
      }
      continue
    }

    // Unordered list
    if (tag === 'ul') {
      for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
        result.push(
          new Paragraph({
            children: inlineToRuns(li as HTMLElement, deps),
            numbering: { reference: 'bullet-list', level: 0 },
            spacing: { after: 80 },
          }),
        )
      }
      continue
    }

    // Ordered list
    if (tag === 'ol') {
      for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
        result.push(
          new Paragraph({
            children: inlineToRuns(li as HTMLElement, deps),
            numbering: { reference: 'decimal-list', level: 0 },
            spacing: { after: 80 },
          }),
        )
      }
      continue
    }

    // Resizable image (TipTap custom node renders as <figure data-resizable-image>)
    if (tag === 'figure' && el.hasAttribute('data-resizable-image')) {
      const img = el.querySelector('img')
      const caption = el.querySelector('figcaption')?.textContent?.trim()
      if (img?.src) {
        try {
          const widthAttr = img.getAttribute('width')
          const desiredWidth = widthAttr ? parseInt(widthAttr, 10) : null
          const imgData = await loadImageData(img.src, desiredWidth)
          const alignment = el.getAttribute('data-alignment') ?? 'center'
          const alignMap: Record<string, typeof AlignmentType[keyof typeof AlignmentType]> = {
            left: AlignmentType.LEFT,
            center: AlignmentType.CENTER,
            right: AlignmentType.RIGHT,
          }
          result.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgData.data,
                  type: imgData.type,
                  transformation: { width: imgData.width, height: imgData.height },
                }),
              ],
              alignment: alignMap[alignment] ?? AlignmentType.CENTER,
              spacing: { before: 160, after: 80 },
            }),
          )
          if (caption) {
            result.push(
              new Paragraph({
                children: [new TextRun({ text: caption, size: 18, color: '6b7280', italics: true })],
                alignment: alignMap[alignment] ?? AlignmentType.CENTER,
                spacing: { after: 160 },
              }),
            )
          }
        } catch {
          // If image load fails, skip it silently
        }
      }
      continue
    }

    // Horizontal rule
    if (tag === 'hr') {
      result.push(
        new Paragraph({
          children: [],
          border: { bottom: { style: deps.BorderStyle.SINGLE, size: 6, color: 'e5e7eb' } },
          spacing: { after: 160 },
        }),
      )
      continue
    }

    // Fallback: treat as paragraph
    const runs = inlineToRuns(el, deps)
    if (runs.length > 0) {
      result.push(new Paragraph({ children: runs, spacing: { after: 120 } }))
    }
  }

  return result
}

// Convert inline children of a block element to TextRun[]
function inlineToRuns(
  el: HTMLElement,
  deps: DocxDeps,
  marks: { bold?: boolean; italics?: boolean; underline?: boolean; strike?: boolean; code?: boolean } = {},
): InstanceType<typeof import('docx').TextRun>[] {
  const { TextRun, UnderlineType } = deps
  const runs: InstanceType<typeof import('docx').TextRun>[] = []

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (text) {
        runs.push(
          new TextRun({
            text,
            bold: marks.bold,
            italics: marks.italics,
            underline: marks.underline ? { type: UnderlineType.SINGLE } : undefined,
            strike: marks.strike,
            font: marks.code ? { name: 'Courier New' } : undefined,
          }),
        )
      }
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue

    const child = node as HTMLElement
    const tag = child.tagName?.toLowerCase()
    const nextMarks = { ...marks }

    if (tag === 'strong' || tag === 'b') nextMarks.bold = true
    else if (tag === 'em' || tag === 'i') nextMarks.italics = true
    else if (tag === 'u') nextMarks.underline = true
    else if (tag === 's' || tag === 'del') nextMarks.strike = true
    else if (tag === 'code') nextMarks.code = true
    else if (tag === 'br') {
      runs.push(new TextRun({ text: '', break: 1 }))
      continue
    }

    runs.push(...inlineToRuns(child, deps, nextMarks))
  }

  return runs
}

// Determine paragraph alignment from element style attribute
function getAlignment(
  el: HTMLElement,
  AlignmentType: typeof import('docx').AlignmentType,
): typeof AlignmentType[keyof typeof AlignmentType] | undefined {
  const style = el.getAttribute('style') ?? ''
  if (style.includes('text-align: center') || style.includes('text-align:center')) return AlignmentType.CENTER
  if (style.includes('text-align: right') || style.includes('text-align:right')) return AlignmentType.RIGHT
  if (style.includes('text-align: justify') || style.includes('text-align:justify')) return AlignmentType.BOTH
  return undefined
}

// Load image from a URL (data: or http/https) and return binary data + dimensions
async function loadImageData(
  src: string,
  desiredWidth: number | null,
): Promise<{ data: Uint8Array | ArrayBuffer; type: 'png' | 'jpg'; width: number; height: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}`))
    el.src = src
    setTimeout(() => reject(new Error('Image load timeout')), 5000)
  })

  const maxWidth = 500
  const naturalW = img.naturalWidth || 400
  const naturalH = img.naturalHeight || 300
  const w = Math.min(desiredWidth ?? naturalW, maxWidth)
  const h = Math.round(w * naturalH / naturalW)

  if (src.startsWith('data:')) {
    const type = src.includes('image/png') ? 'png' : 'jpg'
    return { data: base64ToBytes(src), type, width: w, height: h }
  }

  const buf = await fetch(src, { mode: 'cors' }).then((r) => r.arrayBuffer())
  const type = src.toLowerCase().includes('.png') ? 'png' : 'jpg'
  return { data: buf, type, width: w, height: h }
}

// ── Utilities ───────────────────────────────────────────────────────

function base64ToBytes(dataUrl: string): Uint8Array {
  const raw = atob(dataUrl.split(',')[1] ?? '')
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_')
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

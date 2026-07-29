/**
 * Export a recharts chart as a PNG, with no extra dependencies.
 *
 * Recharts renders inline SVG, so the whole job is: clone the <svg>, freeze the
 * computed presentation styles onto the clone (a detached SVG resolves neither
 * the stylesheet nor the Chakra CSS custom properties, so unstyled axis text
 * would otherwise come out black-on-black), serialize, rasterize through an
 * <img> onto a 2x canvas, stamp a footer, and download.
 */

/** Presentation attributes that must survive the trip out of the document. */
const FROZEN_PROPERTIES = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-family', 'font-size', 'opacity']

const freezeStyles = (source: Element, clone: Element) => {
  const computed = window.getComputedStyle(source)
  FROZEN_PROPERTIES.forEach((property) => {
    const value = computed.getPropertyValue(property)
    // A CSS var that failed to resolve serializes as the literal "var(--x)";
    // dropping it lets the SVG default apply instead of painting nothing.
    if (value && !value.includes('var(')) clone.setAttribute(property, value)
  })
  const sourceChildren = Array.from(source.children)
  const cloneChildren = Array.from(clone.children)
  sourceChildren.forEach((child, i) => {
    const target = cloneChildren[i]
    if (target) freezeStyles(child, target)
  })
}

export interface ChartExportOptions {
  /** Basename of the downloaded file, without extension. */
  filename: string
  /** Rendered above the chart in the exported image. */
  title: string
  /** Small print burned into the footer (election id, chain id, …). */
  footer?: string[]
  scale?: number
}

/**
 * Rasterize the first <svg> inside `container` and trigger a download.
 * Resolves to `false` when there is nothing to export or the browser refuses
 * to rasterize the SVG, so callers can surface a message instead of throwing.
 */
export const exportChartPng = async (
  container: HTMLElement | null,
  { filename, title, footer = [], scale = 2 }: ChartExportOptions
): Promise<boolean> => {
  const svg = container?.querySelector('svg')
  if (!svg) return false

  const rect = svg.getBoundingClientRect()
  const width = Math.ceil(rect.width) || 800
  const height = Math.ceil(rect.height) || 300

  const clone = svg.cloneNode(true) as SVGSVGElement
  freezeStyles(svg, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))

  const markup = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('svg rasterization failed'))
      img.src = url
    })

    const headerHeight = 44
    const footerHeight = footer.length > 0 ? 20 + footer.length * 16 : 16
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = (height + headerHeight + footerHeight) * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    ctx.scale(scale, scale)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height + headerHeight + footerHeight)

    ctx.fillStyle = '#0a0a0a'
    ctx.font = '600 16px Inter, system-ui, sans-serif'
    ctx.fillText(title, 16, 28)

    ctx.drawImage(image, 0, headerHeight, width, height)

    ctx.fillStyle = '#737373'
    ctx.font = '11px Inter, system-ui, sans-serif'
    footer.forEach((line, i) => {
      ctx.fillText(line, 16, height + headerHeight + 20 + i * 16)
    })

    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    return true
  } finally {
    URL.revokeObjectURL(url)
  }
}

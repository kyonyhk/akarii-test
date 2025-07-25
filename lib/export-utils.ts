import { format } from 'date-fns'
import type {
  ExportableMessage,
  ExportFormat,
  ExportData,
  ExportOptions,
} from '@/types/export'

/**
 * Formats timestamp to human-readable date string
 */
export function formatTimestamp(timestamp: number): string {
  return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss')
}

/**
 * Generates a filename based on current date and format
 */
export function generateFilename(
  exportFormat: ExportFormat,
  prefix: string = 'akarii-export'
): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
  return `${prefix}-${timestamp}.${exportFormat}`
}

/**
 * Prepares data for export by structuring it consistently
 */
export function prepareExportData(
  messages: ExportableMessage[],
  options: ExportOptions,
  filters?: any
): ExportData {
  const exportData: ExportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalCount: messages.length,
      exportFormat: options.format,
      generatedBy: 'Akarii Decision Documentation System',
    },
    data: messages.map(item => {
      const exportMessage: ExportableMessage = {
        message: {
          ...item.message,
          // Convert timestamp to readable format in JSON export
          timestamp: item.message.timestamp,
        },
      }

      // Include user data if available
      if (item.message.user) {
        exportMessage.message.user = item.message.user
      }

      // Include analysis data based on options
      if (options.includeAnalysis && item.analysis) {
        exportMessage.analysis = { ...item.analysis }
      }

      return exportMessage
    }),
  }

  // Include filters if provided
  if (filters) {
    exportData.metadata.filters = filters
  }

  return exportData
}

/**
 * Exports data as JSON format
 */
export function exportAsJSON(data: ExportData, filename?: string): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  downloadBlob(blob, filename || generateFilename('json'))
}

/**
 * Exports data as Markdown format
 */
export function exportAsMarkdown(data: ExportData, filename?: string): void {
  let markdown = `# Akarii Decision Documentation Export\n\n`

  // Metadata section
  markdown += `## Export Information\n\n`
  markdown += `- **Exported At:** ${formatTimestamp(new Date(data.metadata.exportedAt).getTime())}\n`
  markdown += `- **Total Messages:** ${data.metadata.totalCount}\n`
  markdown += `- **Format:** ${data.metadata.exportFormat}\n`

  if (data.metadata.filters) {
    markdown += `- **Applied Filters:** ${JSON.stringify(data.metadata.filters, null, 2)}\n`
  }

  markdown += `\n---\n\n`

  // Messages section
  markdown += `## Messages and Analysis\n\n`

  data.data.forEach((item, index) => {
    const msg = item.message
    markdown += `### Message ${index + 1}\n\n`
    markdown += `**Content:** ${msg.content}\n\n`
    markdown += `**Date:** ${formatTimestamp(msg.timestamp)}\n\n`

    if (msg.user) {
      markdown += `**Author:** ${msg.user.name || msg.user.email}\n\n`
    }

    if (item.analysis) {
      const analysis = item.analysis
      markdown += `#### Analysis\n\n`
      markdown += `- **Statement Type:** ${analysis.statementType}\n`
      markdown += `- **Confidence Level:** ${analysis.confidenceLevel}%\n`

      if (analysis.beliefs.length > 0) {
        markdown += `- **Beliefs:**\n`
        analysis.beliefs.forEach((belief: string) => {
          markdown += `  - ${belief}\n`
        })
      }

      if (analysis.tradeOffs.length > 0) {
        markdown += `- **Trade-offs:**\n`
        analysis.tradeOffs.forEach((tradeOff: string) => {
          markdown += `  - ${tradeOff}\n`
        })
      }

      markdown += `- **Community Votes:** ↑${analysis.thumbsUp} ↓${analysis.thumbsDown}\n`
    }

    markdown += `\n---\n\n`
  })

  const blob = new Blob([markdown], { type: 'text/markdown' })
  downloadBlob(blob, filename || generateFilename('markdown', 'akarii-export'))
}

/**
 * Downloads a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Main export function that handles different formats
 */
export async function exportData(
  messages: ExportableMessage[],
  options: ExportOptions,
  filters?: any
): Promise<void> {
  const data = prepareExportData(messages, options, filters)

  switch (options.format) {
    case 'json':
      exportAsJSON(data, options.filename)
      break
    case 'markdown':
      exportAsMarkdown(data, options.filename)
      break
    case 'pdf':
      // PDF export will be implemented later
      throw new Error('PDF export not yet implemented')
    default:
      throw new Error(`Unsupported export format: ${options.format}`)
  }
}

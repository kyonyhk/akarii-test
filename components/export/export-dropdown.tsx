'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileJson, FileText, FileImage, Loader2 } from 'lucide-react'
import { exportData } from '@/lib/export-utils'
import type {
  ExportableMessage,
  ExportFormat,
  ExportOptions,
} from '@/types/export'

interface ExportDropdownProps {
  data: ExportableMessage[]
  filters?: any
  disabled?: boolean
  className?: string
}

export function ExportDropdown({
  data,
  filters,
  disabled = false,
  className = '',
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null
  )

  const handleExport = async (format: ExportFormat) => {
    if (isExporting || data.length === 0) return

    setIsExporting(true)
    setExportingFormat(format)

    try {
      const options: ExportOptions = {
        format,
        includeMetadata: true,
        includeAnalysis: true,
        includeRawData: false, // Exclude raw data by default to keep exports clean
      }

      await exportData(data, options, filters)
    } catch (error) {
      console.error('Export failed:', error)
      // TODO: Show toast notification for error
    } finally {
      setIsExporting(false)
      setExportingFormat(null)
    }
  }

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'json':
        return <FileJson className="mr-2 h-4 w-4" />
      case 'markdown':
        return <FileText className="mr-2 h-4 w-4" />
      case 'pdf':
        return <FileImage className="mr-2 h-4 w-4" />
      default:
        return <Download className="mr-2 h-4 w-4" />
    }
  }

  const getFormatDescription = (format: ExportFormat) => {
    switch (format) {
      case 'json':
        return 'Structured data format'
      case 'markdown':
        return 'Human-readable text format'
      case 'pdf':
        return 'Formatted document (coming soon)'
      default:
        return ''
    }
  }

  const isFormatDisabled = (format: ExportFormat) => {
    return format === 'pdf' // PDF not implemented yet
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting || data.length === 0}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting
            ? `Exporting ${exportingFormat?.toUpperCase()}...`
            : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={
            isFormatDisabled('json') || isExporting
              ? undefined
              : () => handleExport('json')
          }
          className={`cursor-pointer ${isFormatDisabled('json') || isExporting ? 'pointer-events-none opacity-50' : ''}`}
        >
          {getFormatIcon('json')}
          <div className="flex flex-col">
            <span>JSON</span>
            <span className="text-xs text-muted-foreground">
              {getFormatDescription('json')}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={
            isFormatDisabled('markdown') || isExporting
              ? undefined
              : () => handleExport('markdown')
          }
          className={`cursor-pointer ${isFormatDisabled('markdown') || isExporting ? 'pointer-events-none opacity-50' : ''}`}
        >
          {getFormatIcon('markdown')}
          <div className="flex flex-col">
            <span>Markdown</span>
            <span className="text-xs text-muted-foreground">
              {getFormatDescription('markdown')}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={
            isFormatDisabled('pdf') || isExporting
              ? undefined
              : () => handleExport('pdf')
          }
          className={`cursor-pointer ${isFormatDisabled('pdf') || isExporting ? 'pointer-events-none opacity-50' : ''}`}
        >
          {getFormatIcon('pdf')}
          <div className="flex flex-col">
            <span>PDF</span>
            <span className="text-xs text-muted-foreground">
              {getFormatDescription('pdf')}
            </span>
          </div>
        </DropdownMenuItem>

        {data.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No data available for export
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

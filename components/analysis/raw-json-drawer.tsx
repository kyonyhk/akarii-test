'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Check, X } from 'lucide-react'
import { Analysis } from '@/types'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface RawJSONDrawerProps {
  analysis: Analysis
  children: React.ReactNode
}

export function RawJSONDrawer({ analysis, children }: RawJSONDrawerProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  // Create the complete analysis data including metadata
  const rawAnalysisData = {
    id: analysis._id,
    messageId: analysis.messageId,
    analysis: {
      statementType: analysis.statementType,
      beliefs: analysis.beliefs,
      tradeOffs: analysis.tradeOffs,
      confidenceLevel: analysis.confidenceLevel,
    },
    metadata: {
      createdAt: analysis.createdAt,
      formattedTime: new Date(analysis.createdAt).toISOString(),
      thumbsUp: analysis.thumbsUp,
      thumbsDown: analysis.thumbsDown,
      userVotes: analysis.userVotes,
    },
    rawData: analysis.rawData,
  }

  const jsonString = JSON.stringify(rawAnalysisData, null, 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Raw Analysis Data</DrawerTitle>
              <DrawerDescription>
                Complete JSON data for analysis {analysis._id}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="relative">
              <SyntaxHighlighter
                language="json"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}
                showLineNumbers
                wrapLines
              >
                {jsonString}
              </SyntaxHighlighter>
            </div>
          </ScrollArea>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {analysis.statementType} • {analysis.confidenceLevel}%
                confidence
              </span>
              <span>•</span>
              <span>{new Date(analysis.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" size="sm">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

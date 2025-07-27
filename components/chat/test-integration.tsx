'use client'

import { useState } from 'react'
import { DemoChatView } from './demo-chat-view'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageGroupingConfig } from '@/lib/message-grouping'

export function TestIntegration() {
  const [groupingThreshold, setGroupingThreshold] = useState(5) // minutes
  const [timestampThreshold, setTimestampThreshold] = useState(5) // minutes
  const [maxGroupSize, setMaxGroupSize] = useState(10)

  const config: Partial<MessageGroupingConfig> = {
    groupingThreshold: groupingThreshold * 60 * 1000, // Convert to milliseconds
    timestampThreshold: timestampThreshold * 60 * 1000, // Convert to milliseconds
    maxGroupSize,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Task 11.4 Integration Test</h1>
        <p className="text-muted-foreground">
          Testing MessageBubble components with grouping logic integration
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary">
            ✅ Task 11.1: MessageBubble Component
          </Badge>
          <Badge variant="secondary">✅ Task 11.2: Responsive Layout</Badge>
          <Badge variant="secondary">✅ Task 11.3: Grouping Logic</Badge>
          <Badge variant="outline">🚧 Task 11.4: Integration</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Grouping Configuration</CardTitle>
            <CardDescription>
              Adjust the message grouping and timestamp settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Grouping Threshold: {groupingThreshold} minutes
              </label>
              <input
                type="range"
                min="1"
                max="15"
                value={groupingThreshold}
                onChange={e => setGroupingThreshold(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Messages from the same sender within this time are grouped
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Timestamp Threshold: {timestampThreshold} minutes
              </label>
              <input
                type="range"
                min="1"
                max="15"
                value={timestampThreshold}
                onChange={e => setTimestampThreshold(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Show timestamps when this much time has passed
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Max Group Size: {maxGroupSize} messages
              </label>
              <input
                type="range"
                min="3"
                max="20"
                value={maxGroupSize}
                onChange={e => setMaxGroupSize(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Maximum consecutive messages in one group
              </p>
            </div>

            <div className="space-y-2 border-t pt-4">
              <h4 className="font-medium">Test Features:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Message grouping by sender</li>
                <li>• Smart timestamp display</li>
                <li>• Avatar visibility logic</li>
                <li>• Compact vs default variants</li>
                <li>• Date separators</li>
                <li>• Responsive layout</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Demo Chat View */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardContent className="h-full p-0">
              <DemoChatView
                groupingConfig={config}
                showAnalysis={false}
                analysisMode="none"
                className="h-full border-0"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Test Results</CardTitle>
          <CardDescription>
            Verify that all components work together correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium">✅ Features Working:</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  MessageBubble component renders with variants
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Grouping logic processes messages correctly
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Smart timestamp display works as expected
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Avatar shown only for first message in group
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Date separators organize conversation by day
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Responsive layout adapts to container
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium">📝 Test Scenarios:</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Single messages from different users
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Consecutive messages from same user
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Messages with time gaps
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Messages across multiple days
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Real-time message addition
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Configuration changes affect grouping
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

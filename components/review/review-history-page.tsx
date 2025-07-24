'use client'

import { useState } from 'react'
import { MessageHistory } from '@/components/chat/message-history'
import { ConversationSelector } from '@/components/review/conversation-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Filter, Search, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ReviewHistoryPageProps {
  userId: string
  userName?: string
}

export function ReviewHistoryPage({
  userId,
  userName = 'Anonymous',
}: ReviewHistoryPageProps) {
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId)
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting conversation history...')
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message History</h1>
          <p className="text-muted-foreground">
            Browse and search through conversation history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Messages</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search message content..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Conversation</label>
                <ConversationSelector
                  selectedConversationId={selectedConversationId}
                  onConversationSelect={handleConversationSelect}
                  placeholder="Select conversation..."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Conversation Selector */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ConversationSelector
                selectedConversationId={selectedConversationId}
                onConversationSelect={handleConversationSelect}
                showAsList={true}
                className="rounded-none border-0"
              />
            </CardContent>
          </Card>
        </div>

        {/* Message History */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedConversationId
                  ? 'Message Timeline'
                  : 'Select a Conversation'}
              </CardTitle>
              {selectedConversationId && (
                <p className="text-sm text-muted-foreground">
                  Scroll up to load older messages • Use search to find specific
                  content
                </p>
              )}
            </CardHeader>
            <CardContent className="h-full p-0">
              {selectedConversationId ? (
                <MessageHistory
                  conversationId={selectedConversationId}
                  userId={userId}
                  userName={userName}
                  className="h-[600px]"
                />
              ) : (
                <div className="flex h-[600px] items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <h3 className="mb-2 text-lg font-medium">
                      No Conversation Selected
                    </h3>
                    <p className="text-sm">
                      Choose a conversation from the left to view its message
                      history
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

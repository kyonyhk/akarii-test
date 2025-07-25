'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Archive,
  Search,
  Filter,
  Clock,
  Users,
  MessageCircle,
  Download,
  Eye,
  Trash2,
  RotateCcw,
  TrendingUp,
  BarChart3,
  FileText,
  Lightbulb,
  Calendar,
  Tag,
  Settings,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ArchiveInsightsDashboard } from './archive-insights-dashboard'

interface ArchiveDashboardProps {
  className?: string
}

export function ArchiveDashboard({ className }: ArchiveDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [selectedArchive, setSelectedArchive] =
    useState<Id<'conversationArchives'> | null>(null)
  const [showInsights, setShowInsights] = useState(false)

  const archives = useQuery(api.archives.getArchivedConversations, {
    limit: 50,
    category: selectedCategory || undefined,
    priority: (selectedPriority as any) || undefined,
  })

  const restoreConversation = useMutation(api.archives.restoreConversation)
  const deleteArchive = useMutation(api.archives.deleteArchive)
  const generateSummaries = useMutation(
    api.archiveSummaries.generateArchiveSummaries
  )
  const generateInsights = useMutation(
    api.archiveInsights.generateArchiveInsights
  )

  if (!archives) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  const filteredArchives = archives.filter(archive => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      archive.title.toLowerCase().includes(query) ||
      archive.metadata.tags.some(tag => tag.toLowerCase().includes(query)) ||
      (archive.metadata.category &&
        archive.metadata.category.toLowerCase().includes(query))
    )
  })

  const handleRestore = async (archiveId: Id<'conversationArchives'>) => {
    try {
      await restoreConversation({ archiveId })
    } catch (error) {
      console.error('Failed to restore conversation:', error)
    }
  }

  const handleDelete = async (archiveId: Id<'conversationArchives'>) => {
    if (confirm('Are you sure you want to permanently delete this archive?')) {
      try {
        await deleteArchive({ archiveId })
      } catch (error) {
        console.error('Failed to delete archive:', error)
      }
    }
  }

  const handleGenerateAnalysis = async (
    archiveId: Id<'conversationArchives'>
  ) => {
    try {
      await Promise.all([
        generateSummaries({ archiveId }),
        generateInsights({ archiveId }),
      ])
    } catch (error) {
      console.error('Failed to generate analysis:', error)
    }
  }

  const totalMessages = filteredArchives.reduce(
    (sum, archive) => sum + archive.messageCount,
    0
  )
  const totalParticipants = new Set(
    filteredArchives.flatMap(archive => archive.originalParticipants)
  ).size

  const categoryStats = filteredArchives.reduce(
    (acc, archive) => {
      const category = archive.metadata.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const priorityStats = filteredArchives.reduce(
    (acc, archive) => {
      acc[archive.metadata.priority] = (acc[archive.metadata.priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (showInsights && selectedArchive) {
    return (
      <div className={className}>
        <div className="mb-6 flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowInsights(false)}
            className="text-muted-foreground"
          >
            ← Back to Archives
          </Button>
        </div>
        <ArchiveInsightsDashboard archiveId={selectedArchive} />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Archive Center
              </h1>
              <p className="text-muted-foreground">
                Manage and analyze your archived conversations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {filteredArchives.length} Archives
              </Badge>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Archives
                </CardTitle>
                <Archive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredArchives.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Archived conversations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalMessages.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total archived messages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Participants
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalParticipants}</div>
                <p className="text-xs text-muted-foreground">
                  Unique participants
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Categories
                </CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(categoryStats).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Archive categories
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Archives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                  <Input
                    placeholder="Search archives by title, tags, or category..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {Object.keys(categoryStats).map(category => (
                    <SelectItem key={category} value={category}>
                      {category} ({categoryStats[category]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedPriority}
                onValueChange={setSelectedPriority}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priorities</SelectItem>
                  <SelectItem value="critical">
                    Critical ({priorityStats.critical || 0})
                  </SelectItem>
                  <SelectItem value="high">
                    High ({priorityStats.high || 0})
                  </SelectItem>
                  <SelectItem value="medium">
                    Medium ({priorityStats.medium || 0})
                  </SelectItem>
                  <SelectItem value="low">
                    Low ({priorityStats.low || 0})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Archives List */}
        <div className="space-y-4">
          {filteredArchives.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No Archives Found</h3>
                <p className="text-center text-muted-foreground">
                  {searchQuery || selectedCategory || selectedPriority
                    ? 'Try adjusting your filters to see more results.'
                    : 'Start by archiving some conversations to see them here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredArchives.map(archive => (
              <Card
                key={archive._id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium">
                            {archive.title}
                          </h3>
                          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Archived{' '}
                              {formatDistanceToNow(
                                new Date(archive.archivedAt),
                                { addSuffix: true }
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4" />
                              {archive.messageCount} messages
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {archive.originalParticipants.length} participants
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {Math.round(
                                archive.timeRange.duration /
                                  (1000 * 60 * 60 * 24)
                              )}{' '}
                              days
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              archive.metadata.priority === 'critical' ||
                              archive.metadata.priority === 'high'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {archive.metadata.priority}
                          </Badge>
                          <Badge
                            variant={
                              archive.status === 'archived'
                                ? 'success'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {archive.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-2">
                        {archive.metadata.category && (
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Category: {archive.metadata.category}
                            </span>
                          </div>
                        )}

                        {archive.metadata.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-wrap gap-1">
                              {archive.metadata.tags.map(tag => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {archive.archiveReason && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {archive.archiveReason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedArchive(archive._id)
                            setShowInsights(true)
                          }}
                        >
                          <Lightbulb className="mr-2 h-4 w-4" />
                          View Insights
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateAnalysis(archive._id)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Analyze
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(archive._id)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(archive._id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

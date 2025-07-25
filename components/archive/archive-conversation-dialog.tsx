'use client'

import { useState } from 'react'
import { useArchives } from '@/hooks/use-archives'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Archive, Plus, X } from 'lucide-react'

interface ArchiveConversationDialogProps {
  conversationId: string
  conversationTitle: string
  children?: React.ReactNode
}

export function ArchiveConversationDialog({
  conversationId,
  conversationTitle,
  children,
}: ArchiveConversationDialogProps) {
  const [open, setOpen] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<
    'low' | 'medium' | 'high' | 'critical'
  >('medium')
  const [accessLevel, setAccessLevel] = useState<
    'private' | 'participants' | 'team' | 'public'
  >('participants')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [retentionPeriod, setRetentionPeriod] = useState<string>('')

  const { createArchive, isLoading } = useArchives()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createArchive({
        conversationId,
        archiveReason: archiveReason || undefined,
        archiveType: 'manual',
        metadata: {
          tags,
          category: category || undefined,
          priority,
          retentionPeriod: retentionPeriod
            ? parseInt(retentionPeriod)
            : undefined,
          accessLevel,
        },
      })

      // Reset form and close dialog
      setOpen(false)
      setArchiveReason('')
      setCategory('')
      setPriority('medium')
      setAccessLevel('participants')
      setTags([])
      setNewTag('')
      setRetentionPeriod('')
    } catch (error) {
      // Error handling is done in the hook
    }
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Archive Conversation</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Archive &ldquo;{conversationTitle}&rdquo; for future reference and
            analysis
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Archive Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Archiving (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you archiving this conversation? (e.g., Project completed, Meeting concluded, etc.)"
              value={archiveReason}
              onChange={e => setArchiveReason(e.target.value)}
              rows={3}
            />
          </div>

          <Separator />

          {/* Metadata Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Archive Metadata</h4>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                placeholder="e.g., Project Meeting, Team Discussion, Client Call"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>

            {/* Priority and Access Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value: any) => setPriority(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select
                  value={accessLevel}
                  onValueChange={(value: any) => setAccessLevel(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="participants">Participants</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Retention Period */}
            <div className="space-y-2">
              <Label htmlFor="retention">Retention Period (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="retention"
                  type="number"
                  placeholder="365"
                  value={retentionPeriod}
                  onChange={e => setRetentionPeriod(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground">
                How long to keep this archive before automatic deletion
              </p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Conversation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

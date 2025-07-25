'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Share2,
  Copy,
  Check,
  Settings,
  Eye,
  Calendar,
  Trash2,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

interface ShareButtonProps {
  conversationId: string
}

export function ShareButton({ conversationId }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    accessType: 'public' as 'public' | 'private',
    permissions: 'view' as 'view' | 'comment',
    expirationHours: '',
  })

  const conversationLinks = useQuery(
    api.conversationLinks.getConversationLinks,
    {
      conversationId,
    }
  )
  const createLink = useMutation(api.conversationLinks.createConversationLink)
  const deactivateLink = useMutation(
    api.conversationLinks.deactivateConversationLink
  )

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleCreateLink = async () => {
    try {
      const result = await createLink({
        conversationId,
        accessType: createFormData.accessType,
        permissions: createFormData.permissions,
        title: createFormData.title || undefined,
        description: createFormData.description || undefined,
        expirationHours: createFormData.expirationHours
          ? parseInt(createFormData.expirationHours)
          : undefined,
      })

      toast.success('Share link created successfully!')
      setShowCreateForm(false)
      setCreateFormData({
        title: '',
        description: '',
        accessType: 'public',
        permissions: 'view',
        expirationHours: '',
      })

      // Copy the new link to clipboard
      const fullUrl = `${window.location.origin}/share/${result.token}`
      handleCopyUrl(fullUrl)
    } catch (error) {
      toast.error('Failed to create share link')
    }
  }

  const handleDeactivateLink = async (linkId: string) => {
    try {
      await deactivateLink({ linkId })
      toast.success('Share link deactivated')
    } catch (error) {
      toast.error('Failed to deactivate link')
    }
  }

  const activeLinks =
    conversationLinks?.filter(link => link.isActive && !link.isExpired) || []
  const inactiveLinks =
    conversationLinks?.filter(link => !link.isActive || link.isExpired) || []

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Create shareable links to give others access to this conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new link button */}
          {!showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Share Link
            </Button>
          )}

          {/* Create form */}
          {showCreateForm && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">New Share Link</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    value={createFormData.title}
                    onChange={e =>
                      setCreateFormData({
                        ...createFormData,
                        title: e.target.value,
                      })
                    }
                    placeholder="Custom title for this share"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration">
                    Expires in (hours, optional)
                  </Label>
                  <Input
                    id="expiration"
                    type="number"
                    value={createFormData.expirationHours}
                    onChange={e =>
                      setCreateFormData({
                        ...createFormData,
                        expirationHours: e.target.value,
                      })
                    }
                    placeholder="24"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={createFormData.description}
                  onChange={e =>
                    setCreateFormData({
                      ...createFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="What is this conversation about?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Access Type</Label>
                  <Select
                    value={createFormData.accessType}
                    onValueChange={(value: 'public' | 'private') =>
                      setCreateFormData({
                        ...createFormData,
                        accessType: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        Public - Anyone with link
                      </SelectItem>
                      <SelectItem value="private">
                        Private - Restricted access
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <Select
                    value={createFormData.permissions}
                    onValueChange={(value: 'view' | 'comment') =>
                      setCreateFormData({
                        ...createFormData,
                        permissions: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View only</SelectItem>
                      <SelectItem value="comment">View and comment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCreateLink} className="w-full">
                Create Share Link
              </Button>
            </div>
          )}

          {/* Active links */}
          {activeLinks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Active Links</h3>
              {activeLinks.map(link => {
                const fullUrl = `${window.location.origin}/share/${link.token}`
                return (
                  <div
                    key={link._id}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {link.title || 'Untitled Share'}
                        </h4>
                        {link.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {link.description}
                          </p>
                        )}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48">
                          <div className="space-y-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                window.open(fullUrl, '_blank')
                              }}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-red-600"
                              onClick={() => handleDeactivateLink(link._id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{link.viewCount} views</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="capitalize">{link.accessType}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="capitalize">{link.permissions}</span>
                      </div>
                      {link.expiresAt && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Expires{' '}
                            {new Date(link.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Input
                        value={fullUrl}
                        readOnly
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCopyUrl(fullUrl)}
                        variant="outline"
                      >
                        {copiedUrl === fullUrl ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Inactive links */}
          {inactiveLinks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-600">
                Inactive Links
              </h3>
              {inactiveLinks.map(link => (
                <div
                  key={link._id}
                  className="rounded-lg border p-4 opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {link.title || 'Untitled Share'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {link.isExpired ? 'Expired' : 'Deactivated'} •{' '}
                        {link.viewCount} views
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {conversationLinks && conversationLinks.length === 0 && (
            <Alert>
              <AlertDescription>
                No share links have been created for this conversation yet.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

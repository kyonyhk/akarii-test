'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// Available models with their display information
const AVAILABLE_MODELS = [
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o (OpenAI)',
    provider: 'OpenAI',
    description: 'Most capable OpenAI model with advanced reasoning',
  },
  {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini (OpenAI)',
    provider: 'OpenAI',
    description: 'Fast and efficient OpenAI model for most tasks',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet (Anthropic)',
    provider: 'Anthropic',
    description: 'Advanced Anthropic model with excellent reasoning',
  },
  {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro (Google)',
    provider: 'Google',
    description: "Google's latest multimodal AI model",
  },
  {
    id: 'mistral-large-latest',
    displayName: 'Mistral Large (Mistral)',
    provider: 'Mistral',
    description: 'High-performance European AI model',
  },
]

export function ModelSelector() {
  const { user } = useUser()
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Get current user data to check their preferred model
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )
  const updateUserPreference = useMutation(api.users.updateUserPreference)

  // Set initial model when user data loads
  useEffect(() => {
    if (currentUser?.preferredModel) {
      setSelectedModel(currentUser.preferredModel)
    } else {
      // Default to GPT-4o Mini if no preference set
      setSelectedModel('gpt-4o-mini')
    }
  }, [currentUser])

  const handleModelChange = async (modelId: string) => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    setSelectedModel(modelId)
    setIsSaving(true)

    try {
      await updateUserPreference({
        clerkId: user.id,
        preferredModel: modelId,
      })
      toast.success('Model preference updated')
    } catch (error) {
      console.error('Failed to save model preference:', error)
      toast.error('Failed to save model preference')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedModelInfo = AVAILABLE_MODELS.find(
    model => model.id === selectedModel
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="model-select" className="text-sm font-medium">
          Preferred AI Model
        </Label>
        <Select value={selectedModel} onValueChange={handleModelChange}>
          <SelectTrigger id="model-select" className="w-full">
            <SelectValue placeholder="Select an AI model" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS.map(model => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{model.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedModelInfo && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-medium">
            Selected Model Information
          </h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong>Provider:</strong> {selectedModelInfo.provider}
            </p>
            <p>
              <strong>Description:</strong> {selectedModelInfo.description}
            </p>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving preference...</span>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '@/convex/_generated/api'

interface CreateExperimentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ExperimentVariant {
  id: string
  name: string
  description: string
  promptVariant: string
  trafficAllocation: number
  isControl: boolean
}

export function CreateExperimentDialog({
  open,
  onOpenChange,
}: CreateExperimentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  // Form state
  const [experimentData, setExperimentData] = useState({
    name: '',
    description: '',
    hypothesis: '',
    experimentType: 'prompt_variant' as const,
    rolloutPercentage: 50,
    minimumSampleSize: 1000,
    primaryMetric: 'confidence_score',
    secondaryMetrics: ['processing_time', 'quality_score'],
  })

  const [variants, setVariants] = useState<ExperimentVariant[]>([
    {
      id: 'control',
      name: 'Control',
      description: 'Current production prompt',
      promptVariant: 'standard',
      trafficAllocation: 50,
      isControl: true,
    },
    {
      id: 'treatment',
      name: 'Treatment',
      description: 'New optimized prompt',
      promptVariant: 'question_focused',
      trafficAllocation: 50,
      isControl: false,
    },
  ])

  const createExperiment = useMutation(
    api.experimentPrompts.createPromptExperiment
  )

  const handleAddVariant = () => {
    const newVariant: ExperimentVariant = {
      id: `variant_${Date.now()}`,
      name: `Variant ${variants.length + 1}`,
      description: '',
      promptVariant: 'standard',
      trafficAllocation: 0,
      isControl: false,
    }
    setVariants([...variants, newVariant])
  }

  const handleRemoveVariant = (id: string) => {
    if (variants.length <= 2) return // Keep at least 2 variants
    setVariants(variants.filter(v => v.id !== id))
  }

  const handleVariantChange = (id: string, field: string, value: any) => {
    setVariants(variants.map(v => (v.id === id ? { ...v, [field]: value } : v)))
  }

  const normalizeTrafficAllocation = () => {
    const total = variants.reduce((sum, v) => sum + v.trafficAllocation, 0)
    if (total !== 100) {
      const factor = 100 / total
      setVariants(
        variants.map(v => ({
          ...v,
          trafficAllocation: Math.round(v.trafficAllocation * factor),
        }))
      )
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      normalizeTrafficAllocation()

      await createExperiment({
        name: experimentData.name,
        description: experimentData.description,
        hypothesis: experimentData.hypothesis,
        promptVariants: variants.map(v => ({
          id: v.id,
          name: v.name,
          description: v.description,
          promptVariant: v.promptVariant,
          trafficAllocation: v.trafficAllocation,
          isControl: v.isControl,
          systemPromptOverride: undefined,
          userPromptOverride: undefined,
          contextOptions: undefined,
        })),
        targetingRules: {
          userSegments: ['active_user', 'power_user'],
          rolloutPercentage: experimentData.rolloutPercentage,
        },
        metrics: {
          primaryMetric: experimentData.primaryMetric,
          secondaryMetrics: experimentData.secondaryMetrics,
          minimumSampleSize: experimentData.minimumSampleSize,
        },
        schedule: {
          startDate: Date.now(),
          duration: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
        createdBy: 'current-user' as any, // This should come from auth context
      })

      onOpenChange(false)
      setStep(1)
      // Reset form
      setExperimentData({
        name: '',
        description: '',
        hypothesis: '',
        experimentType: 'prompt_variant',
        rolloutPercentage: 50,
        minimumSampleSize: 1000,
        primaryMetric: 'confidence_score',
        secondaryMetrics: ['processing_time', 'quality_score'],
      })
    } catch (error) {
      console.error('Failed to create experiment:', error)
    } finally {
      setLoading(false)
    }
  }

  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return (
          experimentData.name &&
          experimentData.description &&
          experimentData.hypothesis
        )
      case 2:
        return (
          variants.length >= 2 &&
          variants.some(v => v.isControl) &&
          variants.every(v => v.name && v.description)
        )
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New A/B Test</DialogTitle>
          <DialogDescription>
            Set up a new experiment to test prompt variations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map(stepNum => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    step >= stepNum
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`mx-2 h-0.5 w-12 ${
                      step > stepNum ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Experiment Name</Label>
                <Input
                  id="name"
                  value={experimentData.name}
                  onChange={e =>
                    setExperimentData({
                      ...experimentData,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g., Question-Focused Prompt Test"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={experimentData.description}
                  onChange={e =>
                    setExperimentData({
                      ...experimentData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what this experiment aims to test"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hypothesis">Hypothesis</Label>
                <Textarea
                  id="hypothesis"
                  value={experimentData.hypothesis}
                  onChange={e =>
                    setExperimentData({
                      ...experimentData,
                      hypothesis: e.target.value,
                    })
                  }
                  placeholder="e.g., Using question-focused prompts will improve confidence scores by 10%"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rollout">Rollout Percentage</Label>
                  <Select
                    value={experimentData.rolloutPercentage.toString()}
                    onValueChange={value =>
                      setExperimentData({
                        ...experimentData,
                        rolloutPercentage: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="75">75%</SelectItem>
                      <SelectItem value="100">100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleSize">Minimum Sample Size</Label>
                  <Input
                    id="sampleSize"
                    type="number"
                    value={experimentData.minimumSampleSize}
                    onChange={e =>
                      setExperimentData({
                        ...experimentData,
                        minimumSampleSize: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Variants Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Configure Variants</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariant}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
              </div>

              <div className="space-y-4">
                {variants.map((variant, index) => (
                  <Card key={variant.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Variant {index + 1}
                          {variant.isControl && (
                            <Badge variant="secondary" className="ml-2">
                              Control
                            </Badge>
                          )}
                        </CardTitle>
                        {variants.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVariant(variant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={variant.name}
                            onChange={e =>
                              handleVariantChange(
                                variant.id,
                                'name',
                                e.target.value
                              )
                            }
                            placeholder="Variant name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Traffic %</Label>
                          <Input
                            type="number"
                            value={variant.trafficAllocation}
                            onChange={e =>
                              handleVariantChange(
                                variant.id,
                                'trafficAllocation',
                                parseInt(e.target.value) || 0
                              )
                            }
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={variant.description}
                          onChange={e =>
                            handleVariantChange(
                              variant.id,
                              'description',
                              e.target.value
                            )
                          }
                          placeholder="What makes this variant different?"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Prompt Type</Label>
                        <Select
                          value={variant.promptVariant}
                          onValueChange={value =>
                            handleVariantChange(
                              variant.id,
                              'promptVariant',
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="question_focused">
                              Question Focused
                            </SelectItem>
                            <SelectItem value="confidence_calibrated">
                              Confidence Calibrated
                            </SelectItem>
                            <SelectItem value="context_aware">
                              Context Aware
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                Total traffic allocation:{' '}
                {variants.reduce((sum, v) => sum + v.trafficAllocation, 0)}%
                {variants.reduce((sum, v) => sum + v.trafficAllocation, 0) !==
                  100 && (
                  <span className="ml-2 text-yellow-600">
                    (Will be normalized to 100%)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Metrics & Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Metrics & Review</h3>

              <div className="space-y-2">
                <Label>Primary Metric</Label>
                <Select
                  value={experimentData.primaryMetric}
                  onValueChange={value =>
                    setExperimentData({
                      ...experimentData,
                      primaryMetric: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confidence_score">
                      Confidence Score
                    </SelectItem>
                    <SelectItem value="quality_score">Quality Score</SelectItem>
                    <SelectItem value="processing_time">
                      Processing Time
                    </SelectItem>
                    <SelectItem value="user_satisfaction">
                      User Satisfaction
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Experiment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <strong>Name:</strong> {experimentData.name}
                  </div>
                  <div>
                    <strong>Type:</strong> Prompt Variant Test
                  </div>
                  <div>
                    <strong>Variants:</strong> {variants.length}
                  </div>
                  <div>
                    <strong>Sample Size:</strong>{' '}
                    {experimentData.minimumSampleSize.toLocaleString()}
                  </div>
                  <div>
                    <strong>Rollout:</strong> {experimentData.rolloutPercentage}
                    %
                  </div>
                  <div>
                    <strong>Primary Metric:</strong>{' '}
                    {experimentData.primaryMetric}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!isStepValid(step)}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !isStepValid(step)}
              >
                {loading ? 'Creating...' : 'Create Experiment'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

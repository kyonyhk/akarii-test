'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Plus,
  Settings,
  Trash2,
  Edit2,
  Save,
  X,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AlertConfig {
  _id: string
  teamId: string
  alertType: 'token_limit' | 'cost_limit' | 'daily_usage' | 'monthly_usage'
  thresholdValue: number
  thresholdUnit: 'tokens' | 'dollars' | 'percentage'
  timeWindow: 'daily' | 'weekly' | 'monthly' | 'total'
  isActive: boolean
  notificationMethods: ('email' | 'dashboard' | 'webhook')[]
  warningThreshold?: number
  createdAt: number
  updatedAt: number
}

interface UsageLimit {
  _id: string
  teamId: string
  limitType: 'hard_token_limit' | 'hard_cost_limit' | 'rate_limit'
  limitValue: number
  timeWindow: 'daily' | 'weekly' | 'monthly' | 'total'
  isActive: boolean
  enforcementAction: 'block_requests' | 'require_approval' | 'notify_only'
  createdAt: number
  updatedAt: number
}

interface Team {
  _id: string
  name: string
}

interface AlertManagementProps {
  teams: Team[]
  selectedTeamId?: string
  onTeamSelect: (teamId: string) => void
}

export function AlertManagement({
  teams,
  selectedTeamId,
  onTeamSelect,
}: AlertManagementProps) {
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([])
  const [usageLimits, setUsageLimits] = useState<UsageLimit[]>([])
  const [isCreatingAlert, setIsCreatingAlert] = useState(false)
  const [isCreatingLimit, setIsCreatingLimit] = useState(false)
  const [editingAlert, setEditingAlert] = useState<string | null>(null)
  const [editingLimit, setEditingLimit] = useState<string | null>(null)

  // Mock data - would be replaced with actual Convex queries
  const mockAlertConfigs: AlertConfig[] = [
    {
      _id: '1',
      teamId: selectedTeamId || 'team1',
      alertType: 'cost_limit',
      thresholdValue: 10.0,
      thresholdUnit: 'dollars',
      timeWindow: 'monthly',
      isActive: true,
      notificationMethods: ['email', 'dashboard'],
      warningThreshold: 8.0,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
    {
      _id: '2',
      teamId: selectedTeamId || 'team1',
      alertType: 'token_limit',
      thresholdValue: 500000,
      thresholdUnit: 'tokens',
      timeWindow: 'monthly',
      isActive: true,
      notificationMethods: ['email', 'dashboard', 'webhook'],
      warningThreshold: 400000,
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
    },
  ]

  const mockUsageLimits: UsageLimit[] = [
    {
      _id: '1',
      teamId: selectedTeamId || 'team1',
      limitType: 'hard_cost_limit',
      limitValue: 15.0,
      timeWindow: 'monthly',
      isActive: true,
      enforcementAction: 'block_requests',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
  ]

  // Use mock data for now
  const currentConfigs = selectedTeamId ? mockAlertConfigs : []
  const currentLimits = selectedTeamId ? mockUsageLimits : []

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'token_limit':
        return 'Token Limit'
      case 'cost_limit':
        return 'Cost Limit'
      case 'daily_usage':
        return 'Daily Usage'
      case 'monthly_usage':
        return 'Monthly Usage'
      default:
        return type
    }
  }

  const getLimitTypeLabel = (type: string) => {
    switch (type) {
      case 'hard_token_limit':
        return 'Hard Token Limit'
      case 'hard_cost_limit':
        return 'Hard Cost Limit'
      case 'rate_limit':
        return 'Rate Limit'
      default:
        return type
    }
  }

  const formatThreshold = (value: number, unit: string) => {
    switch (unit) {
      case 'tokens':
        return `${value.toLocaleString()} tokens`
      case 'dollars':
        return `$${value.toFixed(2)}`
      case 'percentage':
        return `${value}%`
      default:
        return value.toString()
    }
  }

  return (
    <div className="space-y-6">
      {/* Team Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Team Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label htmlFor="team-select">Select Team to Manage</Label>
            <Select value={selectedTeamId} onValueChange={onTeamSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team._id} value={team._id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedTeamId && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a team to manage alert configurations and usage
            limits.
          </AlertDescription>
        </Alert>
      )}

      {selectedTeamId && (
        <>
          {/* Alert Configurations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Alert Configurations</CardTitle>
              <Button
                onClick={() => setIsCreatingAlert(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Alert
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentConfigs.length === 0 && !isCreatingAlert && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No alert configurations found. Click &quot;Add Alert&quot;
                    to create your first one.
                  </p>
                )}

                {currentConfigs.map(config => (
                  <AlertConfigCard
                    key={config._id}
                    config={config}
                    isEditing={editingAlert === config._id}
                    onEdit={() => setEditingAlert(config._id)}
                    onSave={() => setEditingAlert(null)}
                    onCancel={() => setEditingAlert(null)}
                    onDelete={() => {
                      // Would call actual delete mutation
                      console.log('Delete alert config:', config._id)
                    }}
                  />
                ))}

                {isCreatingAlert && (
                  <NewAlertConfigForm
                    teamId={selectedTeamId}
                    onSave={() => setIsCreatingAlert(false)}
                    onCancel={() => setIsCreatingAlert(false)}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Limits */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Usage Limits (Hard Enforcement)</CardTitle>
              <Button
                onClick={() => setIsCreatingLimit(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Limit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentLimits.length === 0 && !isCreatingLimit && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No usage limits configured. Click &quot;Add Limit&quot; to
                    create enforcement rules.
                  </p>
                )}

                {currentLimits.map(limit => (
                  <UsageLimitCard
                    key={limit._id}
                    limit={limit}
                    isEditing={editingLimit === limit._id}
                    onEdit={() => setEditingLimit(limit._id)}
                    onSave={() => setEditingLimit(null)}
                    onCancel={() => setEditingLimit(null)}
                    onDelete={() => {
                      console.log('Delete usage limit:', limit._id)
                    }}
                  />
                ))}

                {isCreatingLimit && (
                  <NewUsageLimitForm
                    teamId={selectedTeamId}
                    onSave={() => setIsCreatingLimit(false)}
                    onCancel={() => setIsCreatingLimit(false)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function AlertConfigCard({
  config,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  config: AlertConfig
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <Card
      className={`border-l-4 ${config.isActive ? 'border-l-green-500' : 'border-l-gray-300'}`}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {getAlertTypeLabel(config.alertType)}
              </h4>
              <Badge variant={config.isActive ? 'default' : 'secondary'}>
                {config.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Threshold:{' '}
              {formatThreshold(config.thresholdValue, config.thresholdUnit)}
              {config.warningThreshold && (
                <span className="ml-2 text-yellow-600">
                  (Warning at{' '}
                  {formatThreshold(
                    config.warningThreshold,
                    config.thresholdUnit
                  )}
                  )
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500">
              Time Window: {config.timeWindow} • Notifications:{' '}
              {config.notificationMethods.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UsageLimitCard({
  limit,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  limit: UsageLimit
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  const getBadgeColor = (action: string) => {
    switch (action) {
      case 'block_requests':
        return 'destructive'
      case 'require_approval':
        return 'secondary'
      case 'notify_only':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <Card
      className={`border-l-4 ${limit.isActive ? 'border-l-red-500' : 'border-l-gray-300'}`}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {getLimitTypeLabel(limit.limitType)}
              </h4>
              <Badge variant={limit.isActive ? 'default' : 'secondary'}>
                {limit.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={getBadgeColor(limit.enforcementAction)}>
                {limit.enforcementAction.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Limit: {limit.limitValue.toLocaleString()}
              {limit.limitType.includes('token')
                ? ' tokens'
                : limit.limitType.includes('cost')
                  ? ' dollars'
                  : ' requests'}
            </p>
            <p className="text-sm text-gray-500">
              Time Window: {limit.timeWindow}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NewAlertConfigForm({
  teamId,
  onSave,
  onCancel,
}: {
  teamId: string
  onSave: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    alertType: 'cost_limit' as const,
    thresholdValue: 10,
    thresholdUnit: 'dollars' as const,
    timeWindow: 'monthly' as const,
    warningThreshold: 8,
    notificationMethods: ['email', 'dashboard'] as const,
  })

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Alert Type</Label>
              <Select
                value={formData.alertType}
                onValueChange={(value: any) =>
                  setFormData(prev => ({ ...prev, alertType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token_limit">Token Limit</SelectItem>
                  <SelectItem value="cost_limit">Cost Limit</SelectItem>
                  <SelectItem value="daily_usage">Daily Usage</SelectItem>
                  <SelectItem value="monthly_usage">Monthly Usage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Time Window</Label>
              <Select
                value={formData.timeWindow}
                onValueChange={(value: any) =>
                  setFormData(prev => ({ ...prev, timeWindow: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Threshold Value</Label>
              <Input
                type="number"
                value={formData.thresholdValue}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    thresholdValue: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <Label>Warning Threshold (Optional)</Label>
              <Input
                type="number"
                value={formData.warningThreshold}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    warningThreshold: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={onSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Alert
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NewUsageLimitForm({
  teamId,
  onSave,
  onCancel,
}: {
  teamId: string
  onSave: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    limitType: 'hard_cost_limit' as const,
    limitValue: 15,
    timeWindow: 'monthly' as const,
    enforcementAction: 'block_requests' as const,
  })

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Limit Type</Label>
              <Select
                value={formData.limitType}
                onValueChange={(value: any) =>
                  setFormData(prev => ({ ...prev, limitType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hard_token_limit">
                    Hard Token Limit
                  </SelectItem>
                  <SelectItem value="hard_cost_limit">
                    Hard Cost Limit
                  </SelectItem>
                  <SelectItem value="rate_limit">Rate Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Enforcement Action</Label>
              <Select
                value={formData.enforcementAction}
                onValueChange={(value: any) =>
                  setFormData(prev => ({ ...prev, enforcementAction: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block_requests">Block Requests</SelectItem>
                  <SelectItem value="require_approval">
                    Require Approval
                  </SelectItem>
                  <SelectItem value="notify_only">Notify Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Limit Value</Label>
              <Input
                type="number"
                value={formData.limitValue}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    limitValue: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <Label>Time Window</Label>
              <Select
                value={formData.timeWindow}
                onValueChange={(value: any) =>
                  setFormData(prev => ({ ...prev, timeWindow: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={onSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Limit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getAlertTypeLabel(type: string) {
  switch (type) {
    case 'token_limit':
      return 'Token Limit'
    case 'cost_limit':
      return 'Cost Limit'
    case 'daily_usage':
      return 'Daily Usage'
    case 'monthly_usage':
      return 'Monthly Usage'
    default:
      return type
  }
}

function getLimitTypeLabel(type: string) {
  switch (type) {
    case 'hard_token_limit':
      return 'Hard Token Limit'
    case 'hard_cost_limit':
      return 'Hard Cost Limit'
    case 'rate_limit':
      return 'Rate Limit'
    default:
      return type
  }
}

function formatThreshold(value: number, unit: string) {
  switch (unit) {
    case 'tokens':
      return `${value.toLocaleString()} tokens`
    case 'dollars':
      return `$${value.toFixed(2)}`
    case 'percentage':
      return `${value}%`
    default:
      return value.toString()
  }
}

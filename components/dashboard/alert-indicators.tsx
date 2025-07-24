'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Bell, CheckCircle, Clock, X } from 'lucide-react'
import { useState } from 'react'

interface AlertData {
  id: string
  type: 'token_limit' | 'cost_limit' | 'daily_usage' | 'monthly_usage'
  level: 'warning' | 'critical'
  message: string
  currentValue: number
  thresholdValue: number
  unit: 'tokens' | 'dollars' | 'percentage'
  timestamp: number
  isActive: boolean
}

interface AlertIndicatorsProps {
  alerts: AlertData[]
  onResolveAlert?: (alertId: string) => void
  className?: string
}

export function AlertIndicators({
  alerts,
  onResolveAlert,
  className,
}: AlertIndicatorsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const activeAlerts = alerts.filter(
    alert => alert.isActive && !dismissedAlerts.has(alert.id)
  )

  const criticalAlerts = activeAlerts.filter(
    alert => alert.level === 'critical'
  )
  const warningAlerts = activeAlerts.filter(alert => alert.level === 'warning')

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
    onResolveAlert?.(alertId)
  }

  const getAlertIcon = (level: string) => {
    if (level === 'critical') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  const getAlertVariant = (level: string) => {
    return level === 'critical' ? 'destructive' : 'default'
  }

  const formatValue = (value: number, unit: string) => {
    switch (unit) {
      case 'tokens':
        return value.toLocaleString()
      case 'dollars':
        return `$${value.toFixed(2)}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return value.toString()
    }
  }

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
        return 'Usage Alert'
    }
  }

  if (activeAlerts.length === 0) {
    return null
  }

  return (
    <div className={className}>
      {/* Alert Summary Banner */}
      {criticalAlerts.length > 0 && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-800">
            <strong>Critical Alert:</strong> {criticalAlerts.length} usage
            limit(s) exceeded. Immediate action required to prevent service
            interruption.
          </AlertDescription>
        </Alert>
      )}

      {warningAlerts.length > 0 && criticalAlerts.length === 0 && (
        <Alert className="mb-4 border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Warning:</strong> {warningAlerts.length} usage threshold(s)
            approaching. Consider reviewing your team's usage patterns.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Alert Cards */}
      <div className="space-y-3">
        {activeAlerts.map(alert => (
          <Card
            key={alert.id}
            className="border-l-4 border-l-red-500 data-[level=warning]:border-l-yellow-500"
            data-level={alert.level}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                {getAlertIcon(alert.level)}
                <CardTitle className="text-sm font-medium">
                  {getAlertTypeLabel(alert.type)}
                </CardTitle>
                <Badge
                  variant={
                    alert.level === 'critical' ? 'destructive' : 'secondary'
                  }
                  className="text-xs"
                >
                  {alert.level.toUpperCase()}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismissAlert(alert.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">{alert.message}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    Current:{' '}
                    <strong>
                      {formatValue(alert.currentValue, alert.unit)}
                    </strong>
                  </span>
                  <span>
                    Threshold:{' '}
                    <strong>
                      {formatValue(alert.thresholdValue, alert.unit)}
                    </strong>
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

interface AlertStatusBadgeProps {
  alertCount: number
  criticalCount: number
  className?: string
}

export function AlertStatusBadge({
  alertCount,
  criticalCount,
  className,
}: AlertStatusBadgeProps) {
  if (alertCount === 0) {
    return (
      <Badge variant="success" className={className}>
        <CheckCircle className="mr-1 h-3 w-3" />
        All Clear
      </Badge>
    )
  }

  if (criticalCount > 0) {
    return (
      <Badge variant="destructive" className={className}>
        <AlertTriangle className="mr-1 h-3 w-3" />
        {criticalCount} Critical
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className={className}>
      <Bell className="mr-1 h-3 w-3" />
      {alertCount} Warning{alertCount > 1 ? 's' : ''}
    </Badge>
  )
}

interface AlertHeaderNotificationProps {
  alertCount: number
  criticalCount: number
  onViewAlerts?: () => void
}

export function AlertHeaderNotification({
  alertCount,
  criticalCount,
  onViewAlerts,
}: AlertHeaderNotificationProps) {
  if (alertCount === 0) {
    return (
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="h-4 w-4 text-gray-400" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative"
      onClick={onViewAlerts}
    >
      <Bell
        className={`h-4 w-4 ${criticalCount > 0 ? 'text-red-500' : 'text-yellow-500'}`}
      />
      {alertCount > 0 && (
        <Badge
          variant={criticalCount > 0 ? 'destructive' : 'secondary'}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
        >
          {alertCount > 99 ? '99+' : alertCount}
        </Badge>
      )}
    </Button>
  )
}

// Hook to use alert data (placeholder - would connect to actual Convex queries)
export function useAlertData(teamId?: string) {
  // This would be replaced with actual Convex queries
  const mockAlerts: AlertData[] = [
    {
      id: '1',
      type: 'cost_limit',
      level: 'warning',
      message: 'Monthly cost usage approaching limit',
      currentValue: 8.5,
      thresholdValue: 10.0,
      unit: 'dollars',
      timestamp: Date.now() - 300000, // 5 minutes ago
      isActive: true,
    },
    {
      id: '2',
      type: 'token_limit',
      level: 'critical',
      message: 'Token limit exceeded - requests may be blocked',
      currentValue: 525000,
      thresholdValue: 500000,
      unit: 'tokens',
      timestamp: Date.now() - 60000, // 1 minute ago
      isActive: true,
    },
  ]

  return {
    alerts: mockAlerts,
    alertCount: mockAlerts.length,
    criticalCount: mockAlerts.filter(a => a.level === 'critical').length,
    warningCount: mockAlerts.filter(a => a.level === 'warning').length,
    isLoading: false,
  }
}

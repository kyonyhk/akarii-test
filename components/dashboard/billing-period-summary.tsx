'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertStatusBadge, useAlertData } from './alert-indicators'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

const currentBillingPeriod = {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  daysElapsed: 15,
  daysTotal: 31,
  progressPercentage: 48,
}

const summaryData = {
  totalSpent: 4.67,
  budget: 10.0,
  budgetUsed: 47,
  tokensUsed: 234500,
  tokensLimit: 500000,
  tokensUsedPercentage: 47,
  averageDailyCost: 0.31,
  projectedMonthlyCost: 9.61,
  costChangeFromLastMonth: 12,
  topSpendingDay: {
    date: '2024-01-08',
    cost: 0.89,
  },
}

export function BillingPeriodSummary() {
  const { alerts, criticalCount, warningCount } = useAlertData()
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getBudgetStatus = () => {
    // Check if there are any cost-related alerts
    const hasCostAlert = alerts.some(alert => 
      alert.type === 'cost_limit' && alert.isActive
    )
    
    if (hasCostAlert) {
      const criticalCostAlert = alerts.some(alert => 
        alert.type === 'cost_limit' && alert.level === 'critical' && alert.isActive
      )
      return criticalCostAlert ? 'destructive' : 'warning'
    }
    
    if (summaryData.budgetUsed < 50) return 'success'
    if (summaryData.budgetUsed < 80) return 'warning'
    return 'destructive'
  }

  const getTokenStatus = () => {
    // Check if there are any token-related alerts
    const hasTokenAlert = alerts.some(alert => 
      alert.type === 'token_limit' && alert.isActive
    )
    
    if (hasTokenAlert) {
      const criticalTokenAlert = alerts.some(alert => 
        alert.type === 'token_limit' && alert.level === 'critical' && alert.isActive
      )
      return criticalTokenAlert ? 'destructive' : 'warning'
    }
    
    if (summaryData.tokensUsedPercentage < 50) return 'success'
    if (summaryData.tokensUsedPercentage < 80) return 'warning'
    return 'destructive'
  }

  const hasAlerts = alerts.length > 0

  return (
    <div className="space-y-6">
      {/* Alert Status Summary */}
      {hasAlerts && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <CardTitle className="text-sm font-medium text-orange-800">
                Usage Alerts Active
              </CardTitle>
            </div>
            <AlertStatusBadge 
              alertCount={alerts.length} 
              criticalCount={criticalCount}
            />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700">
              {criticalCount > 0 
                ? `${criticalCount} critical alert${criticalCount > 1 ? 's' : ''} require immediate attention`
                : `${warningCount} warning${warningCount > 1 ? 's' : ''} - usage approaching limits`
              }
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Period</CardTitle>
            <Badge variant="outline">
              {formatDate(currentBillingPeriod.startDate)} -{' '}
              {formatDate(currentBillingPeriod.endDate)}
            </Badge>
          </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {currentBillingPeriod.daysElapsed}/
                  {currentBillingPeriod.daysTotal} days
                </span>
              </div>
              <Progress
                value={currentBillingPeriod.progressPercentage}
                className="mt-2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {currentBillingPeriod.daysTotal -
                currentBillingPeriod.daysElapsed}{' '}
              days remaining
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={alerts.some(a => a.type === 'cost_limit' && a.isActive) ? 'border-l-4 border-l-red-500' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
            {alerts.some(a => a.type === 'cost_limit' && a.level === 'critical' && a.isActive) && (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
          </div>
          <Badge variant={getBudgetStatus()}>{summaryData.budgetUsed}%</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">
                ${summaryData.totalSpent}
              </div>
              <p className="text-xs text-muted-foreground">
                of ${summaryData.budget} budget
              </p>
            </div>
            <Progress value={summaryData.budgetUsed} className="mt-2" />
            <p className="text-xs text-muted-foreground">
              ${(summaryData.budget - summaryData.totalSpent).toFixed(2)}{' '}
              remaining
            </p>
            {alerts.some(a => a.type === 'cost_limit' && a.isActive) && (
              <p className="text-xs text-red-600 font-medium">
                ⚠ Cost alert active
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={alerts.some(a => a.type === 'token_limit' && a.isActive) ? 'border-l-4 border-l-red-500' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
            {alerts.some(a => a.type === 'token_limit' && a.level === 'critical' && a.isActive) && (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
          </div>
          <Badge variant={getTokenStatus()}>
            {summaryData.tokensUsedPercentage}%
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">
                {summaryData.tokensUsed.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                of {summaryData.tokensLimit.toLocaleString()} tokens
              </p>
            </div>
            <Progress
              value={summaryData.tokensUsedPercentage}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground">
              {(
                summaryData.tokensLimit - summaryData.tokensUsed
              ).toLocaleString()}{' '}
              remaining
            </p>
            {alerts.some(a => a.type === 'token_limit' && a.isActive) && (
              <p className="text-xs text-red-600 font-medium">
                ⚠ Token alert active
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cost Insights</CardTitle>
          <Badge
            variant={
              summaryData.costChangeFromLastMonth > 0
                ? 'destructive'
                : 'success'
            }
          >
            {summaryData.costChangeFromLastMonth > 0 ? '+' : ''}
            {summaryData.costChangeFromLastMonth}%
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-lg font-bold">
                ${summaryData.averageDailyCost}
              </div>
              <p className="text-xs text-muted-foreground">
                Average daily cost
              </p>
            </div>
            <div>
              <div className="text-sm font-medium">
                ${summaryData.projectedMonthlyCost}
              </div>
              <p className="text-xs text-muted-foreground">
                Projected monthly cost
              </p>
            </div>
            <div>
              <div className="text-sm font-medium">
                ${summaryData.topSpendingDay.cost}
              </div>
              <p className="text-xs text-muted-foreground">
                Highest day ({formatDate(summaryData.topSpendingDay.date)})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

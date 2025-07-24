'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

const weeklyData = [
  { period: 'Week 1', inputTokens: 0.012, outputTokens: 0.048, total: 0.06 },
  { period: 'Week 2', inputTokens: 0.018, outputTokens: 0.072, total: 0.09 },
  { period: 'Week 3', inputTokens: 0.015, outputTokens: 0.06, total: 0.075 },
  { period: 'Week 4', inputTokens: 0.022, outputTokens: 0.088, total: 0.11 },
]

const monthlyData = [
  { period: 'Jan', inputTokens: 0.067, outputTokens: 0.268, total: 0.335 },
  { period: 'Feb', inputTokens: 0.089, outputTokens: 0.356, total: 0.445 },
  { period: 'Mar', inputTokens: 0.076, outputTokens: 0.304, total: 0.38 },
  { period: 'Apr', inputTokens: 0.095, outputTokens: 0.38, total: 0.475 },
]

const quarterlyData = [
  { period: 'Q1 2024', inputTokens: 0.232, outputTokens: 0.928, total: 1.16 },
  { period: 'Q2 2024', inputTokens: 0.345, outputTokens: 1.38, total: 1.725 },
  { period: 'Q3 2024', inputTokens: 0.289, outputTokens: 1.156, total: 1.445 },
  { period: 'Q4 2024', inputTokens: 0.412, outputTokens: 1.648, total: 2.06 },
]

const costByFeatureData = [
  { feature: 'Chat Analysis', cost: 1.24, percentage: 35 },
  { feature: 'Document Processing', cost: 0.89, percentage: 25 },
  { feature: 'Code Review', cost: 0.67, percentage: 19 },
  { feature: 'Translation', cost: 0.45, percentage: 13 },
  { feature: 'Summarization', cost: 0.28, percentage: 8 },
]

export function CostBreakdownComponent() {
  const renderChart = (data: any[], period: string) => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis tickFormatter={value => `$${value}`} />
        <Tooltip formatter={(value, name) => [`$${value}`, name]} />
        <Area
          type="monotone"
          dataKey="inputTokens"
          stackId="1"
          stroke="#8884d8"
          fill="#8884d8"
          name="Input Tokens"
        />
        <Area
          type="monotone"
          dataKey="outputTokens"
          stackId="1"
          stroke="#82ca9d"
          fill="#82ca9d"
          name="Output Tokens"
        />
      </AreaChart>
    </ResponsiveContainer>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Time Period</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly" className="mt-6">
              {renderChart(weeklyData, 'weekly')}
            </TabsContent>
            <TabsContent value="monthly" className="mt-6">
              {renderChart(monthlyData, 'monthly')}
            </TabsContent>
            <TabsContent value="quarterly" className="mt-6">
              {renderChart(quarterlyData, 'quarterly')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost by Feature</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByFeatureData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={value => `$${value}`} />
              <YAxis dataKey="feature" type="category" width={120} />
              <Tooltip formatter={value => [`$${value}`, 'Cost']} />
              <Bar dataKey="cost" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {costByFeatureData.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span>{item.feature}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {item.percentage}%
                  </span>
                  <span className="font-medium">${item.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

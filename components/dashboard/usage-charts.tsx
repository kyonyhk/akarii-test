'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const usageData = [
  { date: '2024-01-01', tokens: 12000, cost: 0.024 },
  { date: '2024-01-02', tokens: 15000, cost: 0.03 },
  { date: '2024-01-03', tokens: 8000, cost: 0.016 },
  { date: '2024-01-04', tokens: 22000, cost: 0.044 },
  { date: '2024-01-05', tokens: 18000, cost: 0.036 },
  { date: '2024-01-06', tokens: 25000, cost: 0.05 },
  { date: '2024-01-07', tokens: 20000, cost: 0.04 },
]

const modelUsageData = [
  { model: 'GPT-4', usage: 45, color: '#8884d8' },
  { model: 'GPT-3.5', usage: 30, color: '#82ca9d' },
  { model: 'Claude', usage: 25, color: '#ffc658' },
]

export function UsageChartsComponent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={value => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={value => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [
                  name === 'tokens'
                    ? `${value.toLocaleString()} tokens`
                    : `$${value}`,
                  name === 'tokens' ? 'Tokens Used' : 'Cost',
                ]}
              />
              <Line
                type="monotone"
                dataKey="tokens"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ fill: '#8884d8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Cost Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={value => new Date(value).toLocaleDateString()}
              />
              <YAxis tickFormatter={value => `$${value}`} />
              <Tooltip
                labelFormatter={value => new Date(value).toLocaleDateString()}
                formatter={value => [`$${value}`, 'Daily Cost']}
              />
              <Bar dataKey="cost" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Usage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={modelUsageData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ model, usage }) => `${model}: ${usage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="usage"
              >
                {modelUsageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={value => [`${value}%`, 'Usage']} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

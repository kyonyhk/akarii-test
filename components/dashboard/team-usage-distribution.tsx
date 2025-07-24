'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const teamMemberData = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@company.com',
    avatar: '/avatars/sarah.jpg',
    tokens: 45000,
    cost: 0.9,
    percentage: 30,
    color: '#8884d8',
  },
  {
    id: '2',
    name: 'Mike Chen',
    email: 'mike@company.com',
    avatar: '/avatars/mike.jpg',
    tokens: 38000,
    cost: 0.76,
    percentage: 25,
    color: '#82ca9d',
  },
  {
    id: '3',
    name: 'Emily Davis',
    email: 'emily@company.com',
    avatar: '/avatars/emily.jpg',
    tokens: 32000,
    cost: 0.64,
    percentage: 21,
    color: '#ffc658',
  },
  {
    id: '4',
    name: 'Alex Rodriguez',
    email: 'alex@company.com',
    avatar: '/avatars/alex.jpg',
    tokens: 28000,
    cost: 0.56,
    percentage: 18,
    color: '#ff7300',
  },
  {
    id: '5',
    name: 'Lisa Wang',
    email: 'lisa@company.com',
    avatar: '/avatars/lisa.jpg',
    tokens: 9000,
    cost: 0.18,
    percentage: 6,
    color: '#00ff88',
  },
]

const departmentData = [
  { department: 'Engineering', tokens: 89000, cost: 1.78, members: 8 },
  { department: 'Product', tokens: 34000, cost: 0.68, members: 4 },
  { department: 'Marketing', tokens: 23000, cost: 0.46, members: 3 },
  { department: 'Sales', tokens: 18000, cost: 0.36, members: 5 },
  { department: 'Support', tokens: 15000, cost: 0.3, members: 3 },
]

export function TeamUsageDistribution() {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Team Member Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={teamMemberData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="percentage"
                >
                  {teamMemberData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={value => [`${value}%`, 'Usage Share']} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {teamMemberData.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${member.cost}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.tokens.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="department"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis tickFormatter={value => `$${value}`} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'cost' ? `$${value}` : value.toLocaleString(),
                    name === 'cost' ? 'Cost' : 'Tokens',
                  ]}
                />
                <Bar dataKey="cost" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {departmentData.map((dept, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{dept.department}</p>
                    <p className="text-xs text-muted-foreground">
                      {dept.members} members
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${dept.cost}</p>
                    <p className="text-xs text-muted-foreground">
                      {dept.tokens.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

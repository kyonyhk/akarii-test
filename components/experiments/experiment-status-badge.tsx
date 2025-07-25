'use client'

import { Badge } from '@/components/ui/badge'

interface ExperimentStatusBadgeProps {
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
}

export function ExperimentStatusBadge({ status }: ExperimentStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
        }
      case 'draft':
        return {
          label: 'Draft',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        }
      case 'paused':
        return {
          label: 'Paused',
          variant: 'outline' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        }
      case 'completed':
        return {
          label: 'Completed',
          variant: 'outline' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
        }
      default:
        return {
          label: 'Unknown',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

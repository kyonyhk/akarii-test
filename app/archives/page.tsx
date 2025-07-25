import { ArchiveDashboard } from '@/components/archive/archive-dashboard'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Archive Center - Akarii',
  description:
    'Manage and analyze your archived conversations with intelligent insights and search capabilities.',
}

export default function ArchivesPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <ArchiveDashboard />
    </div>
  )
}

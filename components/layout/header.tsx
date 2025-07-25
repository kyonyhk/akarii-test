import React from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { BarChart3, MessageSquare, Settings, Users } from 'lucide-react'

interface HeaderProps {
  title?: string
}

export function Header({ title = 'Akarii' }: HeaderProps) {
  const { isSignedIn } = useAuth()

  return (
    <header className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-semibold">{title}</h1>

          {isSignedIn && (
            <nav className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/chat" className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </Link>
              </Button>

              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Teams</span>
                </Link>
              </Button>

              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/experiments"
                  className="flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Experiments</span>
                </Link>
              </Button>

              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/cost-dashboard"
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Analytics</span>
                </Link>
              </Button>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* User menu and controls will go here */}
        </div>
      </div>
    </header>
  )
}

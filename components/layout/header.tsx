import React from 'react'
import Link from 'next/link'
import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  MessageSquare,
  Settings,
  Users,
  LogOut,
  User,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRole } from '@/hooks/useRole'

interface HeaderProps {
  title?: string
}

export function Header({ title = 'Akarii' }: HeaderProps) {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { isAdmin } = useRole()

  return (
    <header className="border-b border-border/50 bg-background/80 px-8 py-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-12">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight transition-colors duration-150 hover:text-primary"
          >
            {title}
          </Link>

          {isSignedIn && (
            <nav className="flex items-center space-x-6">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/chat" className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </Link>
              </Button>

              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href="/dashboard"
                    className="flex items-center space-x-2"
                  >
                    <Users className="h-4 w-4" />
                    <span>Teams</span>
                  </Link>
                </Button>
              )}

              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href="/experiments"
                    className="flex items-center space-x-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Experiments</span>
                  </Link>
                </Button>
              )}

              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href="/cost-dashboard"
                    className="flex items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Analytics</span>
                  </Link>
                </Button>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-6">
          {isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {user?.fullName || user?.username || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  disabled
                  className="text-sm text-muted-foreground"
                >
                  {user?.primaryEmailAddress?.emailAddress}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex cursor-pointer items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <SignOutButton>
                  <DropdownMenuItem className="flex cursor-pointer items-center space-x-2">
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

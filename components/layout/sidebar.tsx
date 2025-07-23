import React from 'react'

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-64 border-r bg-background">
      <div className="p-4">
        <nav className="space-y-2">{children}</nav>
      </div>
    </aside>
  )
}

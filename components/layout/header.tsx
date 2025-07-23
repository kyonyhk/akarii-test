import React from 'react'

interface HeaderProps {
  title?: string
}

export function Header({ title = 'Akarii' }: HeaderProps) {
  return (
    <header className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center space-x-4">
          {/* User menu and controls will go here */}
        </div>
      </div>
    </header>
  )
}

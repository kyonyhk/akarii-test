import React from 'react'
import { Header } from './header'

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
}

export function MainLayout({ children, title }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header title={title} />
      <main className="container mx-auto px-8 py-12">{children}</main>
    </div>
  )
}

'use client'

import { MainLayout } from '@/components/layout/main-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ModelSelector } from '@/components/settings/model-selector'

export default function SettingsPage() {
  return (
    <MainLayout title="Settings">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your preferences and account settings.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Preferences</CardTitle>
              <CardDescription>
                Choose your preferred AI model for message analysis and
                responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModelSelector />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

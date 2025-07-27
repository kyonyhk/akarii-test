'use client'

import { useRole } from '@/hooks'

export default function TestUseRolePage() {
  const { role, isLoading, isAdmin, isUser } = useRole()

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-bold">Testing useRole Hook</h1>
        <p>Loading user role...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Testing useRole Hook</h1>
      <div className="space-y-2">
        <p>
          <strong>Role:</strong> {role || 'No role assigned'}
        </p>
        <p>
          <strong>Is Loading:</strong> {isLoading.toString()}
        </p>
        <p>
          <strong>Is Admin:</strong> {isAdmin.toString()}
        </p>
        <p>
          <strong>Is User:</strong> {isUser.toString()}
        </p>
      </div>
    </div>
  )
}

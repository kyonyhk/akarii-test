# Clerk Role-Based Access Control Setup Guide

## Overview

This guide walks through configuring role-based access control using Clerk's publicMetadata feature to store user roles that sync with our Convex database.

## Clerk Dashboard Configuration

### Step 1: Access User Settings

1. Navigate to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Configure** → **User & Organization** → **User**

### Step 2: Add Role Property

1. Scroll down to **Custom user properties**
2. Click **Add property**
3. Configure the role property:
   - **Name**: `role`
   - **Type**: `String`
   - **Private**: `No` (must be public to access via publicMetadata)
   - **Default value**: `user` (optional, but recommended)

### Step 3: Save Configuration

Click **Save** to apply the changes.

## Role Assignment

### Method 1: Via Clerk Dashboard (Manual)

1. Go to **Users** in the Clerk dashboard
2. Select a user
3. Scroll to **Public metadata**
4. Add: `{"role": "admin"}` (or "user", "guest", "member")
5. Click **Save**

### Method 2: Via Clerk API (Programmatic)

```javascript
// Update user's public metadata
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: 'admin',
  },
})
```

### Method 3: Via Clerk Backend API (Webhooks)

```javascript
// In a webhook handler
const { data } = evt
if (data.public_metadata?.role) {
  // Role is already set
} else {
  // Set default role for new users
  await clerkClient.users.updateUserMetadata(data.id, {
    publicMetadata: {
      role: 'user',
    },
  })
}
```

## Available Roles

- `admin` - Full system access
- `user` - Standard user access (default)
- `guest` - Limited read-only access
- `member` - Enhanced user access

## Implementation Details

### Frontend Integration

The role is automatically synced from Clerk to Convex when:

1. User signs in
2. User metadata changes
3. Component mounts with authenticated user

### Database Schema

The role is stored in the Convex `users` table:

```typescript
role: 'admin' | 'user' | 'guest' | 'member'
```

### Default Behavior

- New users without a role in Clerk metadata default to `'user'`
- Existing users retain their current roles during updates
- Role changes in Clerk automatically sync to Convex

## Troubleshooting

### Role Not Syncing

1. Verify the role property is set to **Public** (not Private) in Clerk
2. Check browser developer tools for console errors
3. Ensure user has signed out and back in after role changes

### Role Not Appearing in Dashboard

1. Refresh the Clerk dashboard
2. Check that the property name is exactly `role` (case-sensitive)
3. Verify JSON formatting in public metadata: `{"role": "admin"}`

### Permission Errors

1. Confirm the role value matches exactly: `admin`, `user`, `guest`, or `member`
2. Check that the user's session has been refreshed
3. Verify the role is being read correctly in the frontend

## Security Considerations

- Roles are stored in **public metadata** and are visible to the client
- Sensitive authorization should always be verified on the backend
- Use Convex auth checks in mutations/queries for secure operations
- Consider implementing role hierarchies for complex permission systems

## Testing

### Create Test Users

1. Sign up new test accounts
2. Assign different roles via Clerk dashboard
3. Verify role synchronization in application
4. Test permission boundaries for each role

### Verify Integration

```javascript
// In your React component
const { user } = useUser()
console.log('User role:', user?.role) // Should show the assigned role
```

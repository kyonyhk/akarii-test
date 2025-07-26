# Clerk Role Configuration Guide

## Overview
This guide explains how to configure user roles in Clerk dashboard to enable role-based access control (RBAC) for the application.

## Step 1: Access Clerk Dashboard

1. Log into your Clerk dashboard at [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application/project

## Step 2: Configure Custom User Properties

1. Navigate to **User & Organization Settings** in the sidebar
2. Click on **Custom User Properties**
3. Click **+ Add Property** button
4. Configure the role property:
   - **Name**: `role`
   - **Type**: `String`
   - **Private**: `No` (this makes it part of publicMetadata)
   - **Description**: User role for access control (admin, user, guest, member)

## Step 3: Assign Admin Role to Test User

### Method 1: Via Clerk Dashboard UI
1. Go to **Users** in the sidebar
2. Click on a user you want to make admin
3. Scroll to **Public metadata** section
4. Click **Edit**
5. Add the following JSON:
   ```json
   {
     "role": "admin"
   }
   ```
6. Click **Save**

### Method 2: Via API (if needed)
```javascript
// Using Clerk Backend API
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: "admin"
  }
});
```

## Step 4: Verify Role Assignment

### For Admin User:
1. In Clerk dashboard, check the user's **Public metadata** section
2. Should show: `{"role": "admin"}`

### For Regular Users:
- New users will have no role metadata initially
- The application will default them to 'user' role
- Existing users without role metadata will also default to 'user'

## Step 5: Testing

### Create Test Users:
1. **Admin User**: Assign `"role": "admin"` in publicMetadata
2. **Regular User**: Leave publicMetadata empty or set `"role": "user"`

### Verify in Application:
1. Sign in with both test users
2. Check the network tab or console logs to verify:
   - Clerk user object contains correct publicMetadata
   - Convex database receives correct role values
   - Application behaves differently for admin vs user

## Role Values

The application supports these role values:
- `admin` - Full administrative access
- `user` - Standard user access (default)
- `member` - Team member access
- `guest` - Limited guest access

## Troubleshooting

### Role Not Syncing:
1. Check that the property is in **publicMetadata** (not privateMetadata)
2. Verify the property name is exactly `role`
3. Check browser dev tools for Clerk user object
4. Look for console errors in user sync process

### Default Role Issues:
- Users without role metadata will default to 'user'
- Existing users need to sign out and back in to sync new role
- Clear browser cache if role changes aren't reflecting

## Code Implementation Notes

The role synchronization happens in:
- `/hooks/useUser.ts` - Reads from Clerk publicMetadata
- `/convex/users.ts` - Stores role in Convex database
- `/providers/auth-provider.tsx` - Provides role context to application

Role is synced on every user session load, ensuring consistency between Clerk and Convex.
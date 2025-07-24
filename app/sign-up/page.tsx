import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Join Akarii</h1>
          <p className="mt-2 text-muted-foreground">
            Create your account to get started
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg border bg-card',
              headerTitle: 'text-2xl font-semibold',
              headerSubtitle: 'text-muted-foreground',
              socialButtonsBlockButton:
                'border-input bg-background hover:bg-accent hover:text-accent-foreground',
              formButtonPrimary:
                'bg-primary text-primary-foreground hover:bg-primary/90',
              formFieldInput: 'border-input bg-background',
              footerActionLink: 'text-primary hover:text-primary/80',
            },
          }}
          routing="path"
          path="/sign-up"
          redirectUrl="/chat"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  )
}

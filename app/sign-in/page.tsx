import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back to Akarii
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        <SignIn
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
          path="/sign-in"
          redirectUrl="/chat"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  )
}

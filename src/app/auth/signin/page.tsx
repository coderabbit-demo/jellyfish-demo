export const dynamic = "force-dynamic";

import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-900">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="text-4xl mb-2">✦</div>
          <CardTitle className="text-2xl font-bold">Welcome to StarWatch</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in to track upcoming astronomical events and get personalized
            email reminders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              const params = await searchParams;
              await signIn("google", {
                redirectTo: params.callbackUrl ?? "/onboarding",
              });
            }}
          >
            <Button
              type="submit"
              className="w-full bg-white text-slate-900 hover:bg-slate-100 font-medium gap-2"
              size="lg"
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            By signing in, you agree to receive astronomical event notifications
            at the email address associated with your Google account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

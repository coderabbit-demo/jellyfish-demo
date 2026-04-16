import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  // If already onboarded, skip to dashboard
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingComplete: true },
  });
  if (user?.onboardingComplete) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">✦</div>
          <h1 className="text-3xl font-bold">Set up StarWatch</h1>
          <p className="text-muted-foreground mt-2">
            Personalise your event feed and notification preferences.
          </p>
        </div>
        <OnboardingForm userName={session.user.name ?? "there"} />
      </div>
    </div>
  );
}

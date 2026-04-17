import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingComplete: true, name: true, locationCity: true },
  });

  if (!user?.onboardingComplete) redirect("/onboarding");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="text-xl font-bold tracking-tight">✦ StarWatch</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.locationCity ?? session.user.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </nav>

      {/* Content — events will be wired up in sub-phase 2b */}
      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-5xl">🔭</div>
        <h1 className="text-2xl font-bold">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-muted-foreground max-w-md">
          Your personalised event feed is coming in sub-phase 2b. For now,
          authentication and preferences are set up and ready.
        </p>
        <div className="flex gap-3 mt-2">
          <a href="/settings">
            <Button variant="outline">Manage preferences</Button>
          </a>
        </div>
      </main>
    </div>
  );
}

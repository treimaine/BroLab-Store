import { ModernDashboard } from "@/components/dashboard/ModernDashboard";
import { DashboardDataProvider } from "@/providers/DashboardDataProvider";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";

export default function Dashboard() {
  return (
    <>
      <SignedIn>
        <DashboardDataProvider>
          <ModernDashboard />
        </DashboardDataProvider>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

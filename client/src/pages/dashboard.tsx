import { LazyDashboard } from "@/components/LazyDashboard";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";

export default function Dashboard() {
  return (
    <>
      <SignedIn>
        <LazyDashboard />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

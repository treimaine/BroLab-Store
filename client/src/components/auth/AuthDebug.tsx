import { useUser } from "@clerk/clerk-react";

export function AuthDebug() {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">🔍 Auth Debug</h3>
      <div className="space-y-1">
        <div>Clerk Loaded: {clerkLoaded ? "✅" : "❌"}</div>
        <div>Is Signed In: {isSignedIn ? "✅" : "❌"}</div>
        <div>Has User: {clerkUser ? "✅" : "❌"}</div>
        {clerkUser && (
          <>
            <div>User ID: {clerkUser.id?.substring(0, 8)}...</div>
            <div>Email: {clerkUser.primaryEmailAddress?.emailAddress}</div>
            <div>Name: {clerkUser.fullName || "No name"}</div>
          </>
        )}
      </div>
    </div>
  );
}

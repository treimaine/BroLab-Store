import FileManager from "@/components/admin/FileManager";
import { useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";

export default function AdminFilesPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [, navigate] = useLocation();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  // Check if user is authenticated and admin
  if (!clerkUser) {
    navigate("/login");
    return null;
  }

  // Simple admin check - in production, use proper role-based access
  const isAdmin =
    clerkUser.emailAddresses[0]?.emailAddress === "admin@brolabentertainment.com" ||
    clerkUser.username === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Accès refusé</h1>
          <p className="text-gray-400">Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] text-white">
      <div className="container mx-auto px-4 py-8">
        <FileManager />
      </div>
    </div>
  );
}

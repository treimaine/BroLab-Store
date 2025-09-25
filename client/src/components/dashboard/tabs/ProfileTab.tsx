/**
 * Profile Tab Component
 *
 * Code-split profile tab for user profile management.
 * This component is lazy-loaded to improve initial bundle size.
 */

import UserProfile from "@/components/UserProfile";
import { memo } from "react";

interface ProfileTabProps {
  user: any; // Replace with proper user type
}

const ProfileTab = memo<ProfileTabProps>(({ user }) => {
  return <UserProfile className="max-w-4xl mx-auto" />;
});

ProfileTab.displayName = "ProfileTab";

export default ProfileTab;

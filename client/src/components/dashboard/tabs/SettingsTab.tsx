/**
 * Settings Tab Component
 *
 * Code-split settings tab for user settings management.
 * This component is lazy-loaded to improve initial bundle size.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClerk } from "@clerk/clerk-react";
import { User } from "lucide-react";
import { memo } from "react";

interface SettingsTabProps {
  user: any; // Replace with proper user type
}

const SettingsTab = memo<SettingsTabProps>(({ user }) => {
  const { openUserProfile } = useClerk();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>User profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-3">
            <div>
              <label className="text-xs sm:text-sm font-medium text-white">Full name</label>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-white">Email</label>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm"
            onClick={() => {
              // Open Clerk profile interface
              openUserProfile();
            }}
          >
            Edit profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

SettingsTab.displayName = "SettingsTab";

export default SettingsTab;

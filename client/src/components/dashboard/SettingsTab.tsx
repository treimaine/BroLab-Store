import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Shield, User } from "lucide-react";

interface SettingsTabProps {
  subscriptionStatus: string;
}

export default function SettingsTab({ subscriptionStatus }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <User className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-gray-400 text-sm">Receive updates about your account</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Marketing Emails</p>
              <p className="text-gray-400 text-sm">Receive promotional content</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Two-Factor Authentication</p>
              <p className="text-gray-400 text-sm">Add an extra layer of security</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Subscription Settings */}
      <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
            Subscription Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Current Plan</p>
              <p className="text-gray-400 text-sm">
                {subscriptionStatus === "active" ? "Premium" : "Free"}
              </p>
            </div>
            <Badge
              variant={subscriptionStatus === "active" ? "default" : "secondary"}
              className={subscriptionStatus === "active" ? "bg-green-600" : ""}
            >
              {subscriptionStatus === "active" ? "Active" : "Free"}
            </Badge>
          </div>
          {subscriptionStatus === "active" && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Auto-Renewal</p>
                <p className="text-gray-400 text-sm">Automatically renew your subscription</p>
              </div>
              <Switch defaultChecked />
            </div>
          )}
          <Button variant="outline" className="w-full">
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Shield className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Profile Visibility</p>
              <p className="text-gray-400 text-sm">Control who can see your profile</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Activity Status</p>
              <p className="text-gray-400 text-sm">Show when you're online</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button variant="outline" className="w-full">
            Download My Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

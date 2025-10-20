import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { AlertCircle, TestTube } from "lucide-react";
import { useState } from "react";

export function ClerkPaymentTest() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const runPaymentTest = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to test payments",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Test creating a checkout session
      const response = await fetch("/api/clerk/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 999, // $9.99 in cents
          currency: "usd",
          metadata: {
            userId: user.id,
            userEmail: user.emailAddresses[0]?.emailAddress,
            test: "true",
            description: "Test payment for Clerk Billing integration",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setTestResult({
        success: true,
        data: result,
        message: "Checkout session created successfully",
      });

      toast({
        title: "Test Successful",
        description: "Checkout session created successfully",
      });
    } catch (error) {
      console.error("Payment test error:", error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to create checkout session",
      });

      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Clerk Billing Integration Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <img src={user?.imageUrl} alt="User avatar" className="w-10 h-10 rounded-full" />
            <div>
              <p className="text-white font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-400 text-sm">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="space-y-3">
          <Button
            onClick={runPaymentTest}
            disabled={isTesting || !user}
            className="w-full"
            variant={user ? "default" : "secondary"}
          >
            {isTesting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Testing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Test Clerk Billing Integration
              </div>
            )}
          </Button>

          {!user && (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-orange-400 text-sm">Please sign in to test payments</p>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResult && (
          <div
            className={`p-4 rounded-lg border ${
              testResult.success
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? "SUCCESS" : "FAILED"}
              </Badge>
              <span
                className={`text-sm font-medium ${
                  testResult.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {testResult.message}
              </span>
            </div>

            {testResult.success && testResult.data && (
              <div className="text-sm text-gray-300 space-y-1">
                <p>Session ID: {testResult.data.sessionId}</p>
                <p>Checkout URL: {testResult.data.url ? "Available" : "Not available"}</p>
              </div>
            )}

            {!testResult.success && testResult.error && (
              <p className="text-sm text-red-400">Error: {testResult.error}</p>
            )}
          </div>
        )}

        {/* Test Information */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• This test creates a $9.99 checkout session</p>
          <p>• No actual charges will be made</p>
          <p>• Use test card numbers in Clerk dashboard</p>
        </div>
      </CardContent>
    </Card>
  );
}

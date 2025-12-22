import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { centsToDollars } from "@/utils/currency";
import { CheckCircle, Download, Home, Music, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface CheckoutSuccessData {
  sessionId?: string;
  amount?: number;
  metadata?: Record<string, string>;
  services?: Array<{
    serviceName: string;
    reservationId: string;
    price: number;
  }>;
}

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [checkoutData, setCheckoutData] = useState<CheckoutSuccessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for Clerk checkout session data
    const storedSession = sessionStorage.getItem("clerkCheckoutSession");

    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        setCheckoutData(sessionData);

        // Clean up session storage
        sessionStorage.removeItem("clerkCheckoutSession");

        // Show success message
        toast({
          title: "Payment Successful!",
          description: "Your order has been processed successfully.",
        });
      } catch (error) {
        console.error("Error parsing session data:", error);
      }
    } else {
      // Check URL parameters for session ID
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session_id");

      if (sessionId) {
        // Fetch session details from Clerk
        fetchSessionDetails(sessionId);
      } else {
        // No session data found
        setCheckoutData(null);
      }
    }

    setIsLoading(false);
  }, [toast]);

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/clerk/checkout-session/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        setCheckoutData({
          sessionId: sessionData.id,
          amount: centsToDollars(sessionData.amount), // Convert from cents
          metadata: sessionData.metadata,
        });
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--dark-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] py-8">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-12">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">Payment Successful!</h1>
          <p className="text-xl text-gray-300">
            Thank you for your purchase. Your order has been processed successfully.
          </p>
        </div>

        {/* Order Summary */}
        {checkoutData && (
          <Card className="bg-gray-900 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Music className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Session ID</label>
                  <p className="text-white font-mono text-sm">
                    {checkoutData.sessionId?.slice(-12) || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400">Total Amount</label>
                  <p className="text-2xl font-bold text-green-500">
                    ${checkoutData.amount?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>

              {checkoutData.metadata && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Order Details</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {checkoutData.metadata.services_count && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Services:</span>
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                          {checkoutData.metadata.services_count}
                        </Badge>
                      </div>
                    )}
                    {checkoutData.metadata.cart_count && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Beats:</span>
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                          {checkoutData.metadata.cart_count}
                        </Badge>
                      </div>
                    )}
                    {checkoutData.metadata.reservationIds && (
                      <div className="col-span-full">
                        <span className="text-gray-300">Reservation IDs:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {checkoutData.metadata.reservationIds.split(",").map((id, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {id.slice(-8)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Services Details */}
              {checkoutData.services && checkoutData.services.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Services Purchased</label>
                  <div className="space-y-2">
                    {checkoutData.services.map((service, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="text-white font-medium">{service.serviceName}</p>
                          <p className="text-gray-400 text-sm">
                            ID: {service.reservationId.slice(-8)}
                          </p>
                        </div>
                        <p className="text-green-400 font-bold">${service.price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="bg-gray-900 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">What&apos;s Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {checkoutData?.metadata?.cart_count && (
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Download className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-white font-medium mb-2">Download Your Beats</h3>
                  <p className="text-gray-400 text-sm">
                    Access your purchased beats from your dashboard
                  </p>
                </div>
              )}

              {checkoutData?.metadata?.services_count && (
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Music className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-medium mb-2">Service Confirmation</h3>
                  <p className="text-gray-400 text-sm">
                    We&apos;ll contact you within 24 hours to confirm your service booking
                  </p>
                </div>
              )}

              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-white font-medium mb-2">Manage Account</h3>
                <p className="text-gray-400 text-sm">
                  View orders and manage your account settings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation("/dashboard")}
            className="btn-primary text-lg px-8 py-3"
          >
            <User className="w-5 h-5 mr-2" />
            Go to Dashboard
          </Button>

          <Button
            onClick={() => setLocation("/shop")}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800 text-lg px-8 py-3"
          >
            <Music className="w-5 h-5 mr-2" />
            Browse More Beats
          </Button>

          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-gray-400 hover:text-white text-lg px-8 py-3"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm mb-2">
            A confirmation email has been sent to your email address.
          </p>
          <p className="text-gray-500 text-xs">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}

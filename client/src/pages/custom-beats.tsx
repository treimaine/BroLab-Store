import { CustomBeatRequest } from "@/components/CustomBeatRequest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardHero } from "@/components/ui/StandardHero";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser } from "@clerk/clerk-react";
import { AlertTriangle, CheckCircle, Clock, Loader2, Music, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface BeatRequest {
  genre: string;
  subGenre?: string;
  bpm: number;
  key: string;
  mood: string[];
  instruments: string[];
  duration: number;
  description: string;
  referenceTrack?: string;
  budget: number;
  deadline: string;
  revisions: number;
  priority: "standard" | "priority" | "express";
  additionalNotes?: string;
  uploadedFiles?: File[];
}

export default function CustomBeats() {
  const [submittedRequests, setSubmittedRequests] = useState<BeatRequest[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();
  const { user: clerkUser, isSignedIn, isLoaded: clerkLoaded } = useUser();

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Authentication state management
  const [authState, setAuthState] = useState({
    isLoading: !clerkLoaded,
    hasError: false,
    errorMessage: null as string | null,
    isAuthenticated: false,
  });

  // Update auth state when Clerk loads
  useEffect(() => {
    if (clerkLoaded) {
      const newAuthState = {
        isLoading: false,
        isAuthenticated: !!isSignedIn && !!clerkUser,
        hasError: false,
        errorMessage: null,
      };
      setAuthState(newAuthState);
    }
  }, [clerkLoaded, isSignedIn, clerkUser]);

  const handleSubmitRequest = async (request: BeatRequest) => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Enhanced authentication validation (like mixing-mastering service)
      if (!clerkLoaded) {
        toast({
          title: "Please Wait",
          description: "Authentication is still loading. Please try again in a moment.",
          variant: "default",
        });
        return;
      }

      if (!isSignedIn || !clerkUser) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to make a reservation.",
          variant: "destructive",
        });
        return;
      }

      // Calculate total price with priority fees
      const baseBudget = request.budget;
      const priorityFee =
        request.priority === "express" ? 100 : request.priority === "priority" ? 50 : 0;
      const totalPrice = baseBudget + priorityFee;

      // Convert custom beat request to reservation format using REAL user data
      const reservationData = {
        serviceType: "custom_beat" as const,
        clientInfo: {
          firstName: clerkUser.firstName || clerkUser.fullName?.split(" ")[0] || "User",
          lastName: clerkUser.lastName || clerkUser.fullName?.split(" ").slice(1).join(" ") || "",
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || "0000000000",
        },
        preferredDate: new Date(request.deadline).toISOString(),
        preferredDuration: 480, // 8 hours for custom beat production
        serviceDetails: {
          genre: request.genre,
          bpm: request.bpm,
          includeRevisions: request.revisions,
          rushDelivery: request.priority === "express",
        },
        notes: `Genre: ${request.genre}${request.subGenre ? ` (${request.subGenre})` : ""}
BPM: ${request.bpm}
Key: ${request.key}
Mood: ${request.mood.join(", ")}
Instruments: ${request.instruments.join(", ")}
Duration: ${request.duration} seconds
Description: ${request.description}
Reference Track: ${request.referenceTrack || "None"}
Priority: ${request.priority}
Deadline: ${request.deadline}
Revisions: ${request.revisions}
Additional Notes: ${request.additionalNotes || "None"}
Uploaded Files: ${request.uploadedFiles?.length ? `${request.uploadedFiles.length} file(s) uploaded` : "None"}

Custom Beat Request - Priority: ${request.priority}, Delivery: ${request.deadline}`,
        budget: totalPrice * 100, // Convert to cents
        acceptTerms: true, // Required by schema
      };

      console.log("🎵 Creating Custom Beat reservation with authenticated user:", {
        userId: clerkUser.id,
        userName: clerkUser.fullName,
        serviceType: reservationData.serviceType,
        totalPrice,
      });

      console.log("🚀 Sending custom beat reservation data:", reservationData);
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify(reservationData),
      });

      console.log("📡 Custom Beat response status:", response.status);

      if (response.ok) {
        const reservation = await response.json();

        // Create pending payment for checkout (simple format like Production Consultation)
        const pendingPayment = {
          service: "custom_beat",
          serviceName: "Custom Beat Production",
          serviceDetails: `${request.genre} beat - ${request.priority} priority (${request.duration}s)`,
          reservationId: reservation.id,
          price: totalPrice, // Price in dollars (not cents)
          quantity: 1,
        };

        // Add to existing services array (simple format like Production Consultation)
        const existingServices = JSON.parse(sessionStorage.getItem("pendingServices") || "[]");
        const updatedServices = [...existingServices, pendingPayment];
        sessionStorage.setItem("pendingServices", JSON.stringify(updatedServices));

        console.log("✅ Custom Beat reservation created successfully:", {
          reservationId: reservation.id,
          userId: clerkUser.id,
        });
      } else {
        throw new Error("Failed to create custom beat reservation");
      }

      // Update submitted requests for UI
      setSubmittedRequests(prev => [...prev, request]);

      toast({
        title: "Custom Beat Request Added!",
        description: `Your custom beat request has been added to checkout. Priority: ${request.priority}`,
      });

      console.log("🛒 Navigating to checkout for Custom Beat service");
      setLocation("/checkout");
    } catch (error) {
      console.error("❌ Custom Beat submission failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setSubmissionError(errorMessage);

      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      <StandardHero
        title="Custom Beat Production"
        subtitle="Get a professionally produced beat tailored exactly to your vision. Our producers will create something unique just for you."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Authentication Loading State */}
        {authState.isLoading && (
          <div className="mb-8 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-center text-blue-300">
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
              <div className="text-center">
                <p className="font-medium">Loading authentication...</p>
                <p className="text-xs text-blue-400 mt-1">Preparing your personalized experience</p>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Error State */}
        {authState.hasError && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center text-red-300">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <div>
                <p className="font-medium">Authentication Issue</p>
                <p className="text-sm mt-1">{authState.errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submission Error State */}
        {submissionError && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center text-red-300">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <div>
                <p className="font-medium">Submission Error</p>
                <p className="text-sm mt-1">{submissionError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Process Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="card-dark text-center">
            <CardContent className="p-6">
              <Music className="w-12 h-12 mx-auto mb-4 text-[var(--accent-purple)]" />
              <h3 className="text-lg font-semibold mb-2">Submit Request</h3>
              <p className="text-gray-400 text-sm">
                Tell us exactly what you&apos;re looking for with detailed specifications
              </p>
            </CardContent>
          </Card>

          <Card className="card-dark text-center">
            <CardContent className="p-6">
              <Clock className="w-12 h-12 mx-auto mb-4 text-[var(--accent-cyan)]" />
              <h3 className="text-lg font-semibold mb-2">Production</h3>
              <p className="text-gray-400 text-sm">
                Our producers craft your beat with professional attention to detail
              </p>
            </CardContent>
          </Card>

          <Card className="card-dark text-center">
            <CardContent className="p-6">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h3 className="text-lg font-semibold mb-2">Delivery</h3>
              <p className="text-gray-400 text-sm">
                Receive your custom beat with stems and full commercial rights
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request Form */}
          <div className="lg:col-span-2">
            <CustomBeatRequest onSubmit={handleSubmitRequest} isSubmitting={isSubmitting} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Info */}
            <Card className="card-dark">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  What&apos;s Included
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Professional production</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>High-quality WAV file</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Individual stems/trackouts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Commercial licensing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>2 revisions included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Exclusive ownership</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Previous Requests */}
            {submittedRequests.length > 0 && (
              <Card className="card-dark">
                <CardHeader>
                  <CardTitle className="text-white">Your Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {submittedRequests.map((request, index) => (
                    <div key={index} className="p-3 bg-[var(--medium-gray)] rounded-lg">
                      <div className="font-medium text-white">{request.genre} Beat</div>
                      <div className="text-sm text-gray-400">
                        {request.bpm} BPM • {request.key} • $
                        {request.budget +
                          (request.priority === "express"
                            ? 100
                            : request.priority === "priority"
                              ? 50
                              : 0)}
                      </div>
                      <div className="text-xs text-[var(--accent-purple)] mt-1">
                        {request.priority === "express"
                          ? "Express (1-2 days)"
                          : request.priority === "priority"
                            ? "Priority (3-5 days)"
                            : "Standard (5-7 days)"}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* FAQ */}
            <Card className="card-dark">
              <CardHeader>
                <CardTitle className="text-white">FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-white mb-1">How long does it take?</h4>
                  <p className="text-gray-400">
                    Standard: 5-7 days, Priority: 3-5 days, Express: 1-2 days
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">What formats do I get?</h4>
                  <p className="text-gray-400">
                    High-quality WAV files plus individual stems for maximum flexibility
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Can I request changes?</h4>
                  <p className="text-gray-400">
                    Yes! 2 revisions are included to ensure you&apos;re completely satisfied
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Do I own the beat?</h4>
                  <p className="text-gray-400">
                    Absolutely! You get exclusive ownership and full commercial rights
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

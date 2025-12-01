import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StandardHero } from "@/components/ui/StandardHero";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Calendar, Clock, Mail, MapPin, Mic, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  service: string;
  sessionType: string;
  duration: string;
  preferredDate: string;
  preferredTime: string;
  location: string;
  message: string;
  budget: string;
}

export default function RecordingSessions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    service: "recording",
    sessionType: "",
    duration: "",
    preferredDate: "",
    preferredTime: "",
    location: "",
    message: "",
    budget: "",
  });

  // Auto-fill form with user data from Clerk
  useEffect(() => {
    if (isSignedIn && user) {
      setFormData(prev => ({
        ...prev,
        name: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.primaryEmailAddress?.emailAddress || "",
      }));
    }
  }, [isSignedIn, user]);

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Check authentication
      if (!isSignedIn || !user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to make a reservation.",
          variant: "destructive",
        });
        return;
      }

      console.log("🚀 Starting reservation submission for recording session");
      // Convert form data to reservation format using new schema
      const budgetMap: Record<string, number> = {
        "300-500": 40000, // $400 in cents
        "500-1000": 75000, // $750 in cents
        "1000-2000": 150000, // $1500 in cents
        "2000+": 250000, // $2500+ in cents
      };
      const budgetAmount = budgetMap[formData.budget] ?? 250000;

      const reservationData = {
        serviceType: "recording" as const,
        clientInfo: {
          firstName: formData.name.split(" ")[0] || formData.name,
          lastName: formData.name.split(" ").slice(1).join(" ") || "User",
          email: formData.email,
          phone: formData.phone || "0000000000",
        },
        preferredDate: new Date(
          `${formData.preferredDate}T${formData.preferredTime}`
        ).toISOString(),
        preferredDuration: Number.parseInt(formData.duration, 10) * 60, // Convert hours to minutes
        serviceDetails: {
          includeRevisions: 2,
          rushDelivery: false,
        },
        notes: `Session Type: ${formData.sessionType}, Location: ${formData.location}, Budget: ${formData.budget}, Message: ${formData.message}`,
        budget: budgetAmount,
        acceptTerms: true,
      };

      console.log("🚀 Sending reservation data:", reservationData);

      // Get authentication token from Clerk
      const token = await getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Unable to get authentication token. Please try signing in again.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reservationData),
      });

      console.log("📡 Reservation response status:", response.status);

      if (response.ok) {
        const reservation = await response.json();

        // Create pending payment for checkout
        const pendingPayment = {
          service: "recording",
          serviceName: "Recording Session",
          serviceDetails: `${formData.sessionType} - ${formData.duration} hour${Number.parseInt(formData.duration, 10) > 1 ? "s" : ""} (${formData.location})`,
          reservationId: reservation.id,
          price: reservationData.budget / 100, // Convert cents to dollars
          quantity: 1,
        };

        // Add to existing services array
        const existingServices = JSON.parse(sessionStorage.getItem("pendingServices") || "[]");
        const updatedServices = [...existingServices, pendingPayment];
        sessionStorage.setItem("pendingServices", JSON.stringify(updatedServices));

        toast({
          title: "Recording Session Reserved!",
          description: "Complete your payment to confirm the booking.",
        });

        // Redirect to checkout
        setLocation("/checkout");
      } else {
        const errorText = await response.text();
        console.error("❌ Reservation failed:", response.status, errorText);
        toast({
          title: "Booking Failed",
          description: `Failed to create reservation: ${response.status} - ${errorText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <StandardHero
        title="Recording Sessions"
        subtitle="Professional studio recordings with state-of-the-art equipment"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Service Info */}
          <div className="space-y-6">
            <Card className="border-gray-600 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Mic className="w-5 h-5 mr-2" />
                  Recording Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-600/10 border border-purple-600/20 rounded-lg">
                  <h3 className="font-semibold text-purple-400 mb-2">Solo Recording</h3>
                  <p className="text-gray-300 text-sm mb-2">Individual artist recording sessions</p>
                  <p className="text-white font-bold">$150/hour</p>
                </div>

                <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                  <h3 className="font-semibold text-blue-400 mb-2">Group Recording</h3>
                  <p className="text-gray-300 text-sm mb-2">Band or group recording sessions</p>
                  <p className="text-white font-bold">$250/hour</p>
                </div>

                <div className="p-4 bg-green-600/10 border border-green-600/20 rounded-lg">
                  <h3 className="font-semibold text-green-400 mb-2">Full Production</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    Complete recording, mixing, and mastering
                  </p>
                  <p className="text-white font-bold">$500/session</p>
                </div>

                <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">What&apos;s Included:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Professional studio environment</li>
                    <li>• Industry-standard recording equipment</li>
                    <li>• Experienced sound engineer</li>
                    <li>• High-quality audio files</li>
                    <li>• Multiple takes and editing</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <Card className="border-gray-600 bg-gray-800/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Book Your Recording Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">
                      Full Name *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={e => handleInputChange("name", e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white pl-10"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-300">
                      Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => handleInputChange("email", e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white pl-10"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-300">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={e => handleInputChange("phone", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white pl-10"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="sessionType" className="text-gray-300">
                    Session Type *
                  </Label>
                  <Select
                    value={formData.sessionType}
                    onValueChange={value => handleInputChange("sessionType", value)}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select session type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo Recording</SelectItem>
                      <SelectItem value="group">Group Recording</SelectItem>
                      <SelectItem value="production">Full Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration" className="text-gray-300">
                      Session Duration *
                    </Label>
                    <Select
                      value={formData.duration}
                      onValueChange={value => handleInputChange("duration", value)}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="8">8 hours (full day)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="budget" className="text-gray-300">
                      Budget Range
                    </Label>
                    <Select
                      value={formData.budget}
                      onValueChange={value => handleInputChange("budget", value)}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select budget" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300-500">$300 - $500</SelectItem>
                        <SelectItem value="500-1000">$500 - $1000</SelectItem>
                        <SelectItem value="1000-2000">$1000 - $2000</SelectItem>
                        <SelectItem value="2000+">$2000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredDate" className="text-gray-300">
                      Preferred Date *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="preferredDate"
                        type="date"
                        required
                        value={formData.preferredDate}
                        onChange={e => handleInputChange("preferredDate", e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white pl-10"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="preferredTime" className="text-gray-300">
                      Preferred Time *
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="preferredTime"
                        type="time"
                        required
                        value={formData.preferredTime}
                        onChange={e => handleInputChange("preferredTime", e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="location" className="text-gray-300">
                    Preferred Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={e => handleInputChange("location", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white pl-10"
                      placeholder="Our studio or your location"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message" className="text-gray-300">
                    Additional Details
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={e => handleInputChange("message", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
                    placeholder="Tell us about your project, instruments needed, special requirements, etc."
                  />
                </div>

                <Button type="submit" className="w-full btn-primary text-lg py-6">
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Recording Session
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

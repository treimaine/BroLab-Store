import { StandardHero } from "@/components/ui/StandardHero";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { logApiError, logApiRequest, logUserAction, logger } from "@/lib/logger";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Calendar, Clock, Mail, MessageCircle, Phone, User, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface ConsultationFormData {
  name: string;
  email: string;
  phone: string;
  experience: string;
  projectType: string;
  consultationType: string;
  duration: string;
  preferredDate: string;
  preferredTime: string;
  budget: string;
  goals: string;
  challenges: string;
  message: string;
}

export default function ProductionConsultation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [formData, setFormData] = useState<ConsultationFormData>({
    name: "",
    email: "",
    phone: "",
    experience: "",
    projectType: "",
    consultationType: "",
    duration: "",
    preferredDate: "",
    preferredTime: "",
    budget: "",
    goals: "",
    challenges: "",
    message: "",
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

  const handleInputChange = (field: keyof ConsultationFormData, value: string) => {
    logUserAction(`Form field changed: ${field}`, {
      component: "production_consultation",
      action: "form_field_change",
      field,
    });
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

      logger.logInfo("Starting consultation reservation", {
        component: "production_consultation",
        action: "form_submission_start",
      });
      // Convert form data to reservation format using new schema
      const getPriceAmount = (duration: string): number => {
        switch (duration) {
          case "30":
            return 7500; // $75 in cents
          case "60":
            return 15000; // $150 in cents
          case "90":
            return 20000; // $200 in cents
          default:
            return 40000; // $400 for monthly mentorship
        }
      };
      const priceAmount = getPriceAmount(formData.duration);

      const reservationData = {
        serviceType: "consultation" as const,
        clientInfo: {
          firstName: formData.name.split(" ")[0] || formData.name,
          lastName: formData.name.split(" ").slice(1).join(" ") || "User",
          email: formData.email,
          phone: formData.phone || "0000000000",
          experienceLevel: formData.experience as
            | "beginner"
            | "intermediate"
            | "advanced"
            | "professional",
        },
        preferredDate: new Date(
          `${formData.preferredDate}T${formData.preferredTime}`
        ).toISOString(),
        preferredDuration: Number.parseInt(formData.duration, 10),
        serviceDetails: {
          includeRevisions: 1,
          rushDelivery: false,
        },
        notes: `Experience Level: ${formData.experience}
Project Type: ${formData.projectType}
Consultation Type: ${formData.consultationType}
Goals: ${formData.goals}
Challenges: ${formData.challenges}
Additional Message: ${formData.message}`,
        budget: priceAmount,
        acceptTerms: true,
      };

      logApiRequest("POST", "/api/reservations", {
        component: "production_consultation",
        action: "reservation_api_call",
      });
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify(reservationData),
        credentials: "include", // Required for Clerk __session cookie
      });

      logger.logInfo("Consultation response received", {
        component: "production_consultation",
        action: "reservation_response",
        status: response.status,
      });

      if (response.ok) {
        const reservation = await response.json();

        // Create pending payment for checkout
        const pendingPayment = {
          service: "consultation",
          serviceName: "Production Consultation",
          serviceDetails: `${formData.consultationType === "video" ? "Video" : "Audio"} consultation - ${formData.duration} minutes`,
          reservationId: reservation.id,
          price: reservationData.budget / 100, // Convert cents to dollars
          quantity: 1,
        };

        // Add to existing services array
        const existingServices = JSON.parse(sessionStorage.getItem("pendingServices") || "[]");
        const updatedServices = [...existingServices, pendingPayment];
        sessionStorage.setItem("pendingServices", JSON.stringify(updatedServices));
        toast({
          title: "Consultation Booked!",
          description: "We'll contact you within 24 hours to confirm your consultation session.",
        });
        setLocation("/checkout");
      } else {
        throw new Error("Failed to book consultation");
      }
    } catch (error) {
      logApiError(
        "Consultation booking failed",
        error instanceof Error ? error : new Error(String(error)),
        {
          component: "production_consultation",
          action: "form_submission_error",
        }
      );
      toast({
        title: "Booking Failed",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      <StandardHero
        title="Production Consultation"
        subtitle="Get expert guidance to take your music production to the next level. One-on-one sessions with industry professionals."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Service Info */}
          <div className="space-y-6">
            <Card className="border-gray-600 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Consultation Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-600/10 border border-purple-600/20 rounded-lg">
                  <h3 className="font-semibold text-purple-400 mb-2">Quick Consultation</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    30-minute session for specific questions
                  </p>
                  <p className="text-white font-bold">$75/session</p>
                </div>

                <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                  <h3 className="font-semibold text-blue-400 mb-2">Standard Consultation</h3>
                  <p className="text-gray-300 text-sm mb-2">60-minute comprehensive session</p>
                  <p className="text-white font-bold">$150/session</p>
                </div>

                <div className="p-4 bg-green-600/10 border border-green-600/20 rounded-lg">
                  <h3 className="font-semibold text-green-400 mb-2">Extended Consultation</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    90-minute deep dive session with resources
                  </p>
                  <p className="text-white font-bold">$200/session</p>
                </div>

                <div className="p-4 bg-gold-600/10 border border-gold-600/20 rounded-lg">
                  <h3 className="font-semibold text-gold-400 mb-2">Ongoing Mentorship</h3>
                  <p className="text-gray-300 text-sm mb-2">Monthly 1-on-1 sessions for 3 months</p>
                  <p className="text-white font-bold">$400/month</p>
                </div>

                <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">What We Cover:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Production techniques & workflow</li>
                    <li>• Mixing and mastering guidance</li>
                    <li>• Industry insights & career advice</li>
                    <li>• Software recommendations</li>
                    <li>• Creative block solutions</li>
                    <li>• Project feedback & critique</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Consultation Booking Form */}
          <Card className="border-gray-600 bg-gray-800/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Book Your Consultation
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experience" className="text-gray-300">
                      Experience Level *
                    </Label>
                    <Select
                      value={formData.experience}
                      onValueChange={value => handleInputChange("experience", value)}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                        <SelectItem value="advanced">Advanced (3-5 years)</SelectItem>
                        <SelectItem value="professional">Professional (5+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="projectType" className="text-gray-300">
                      Project Type
                    </Label>
                    <Select
                      value={formData.projectType}
                      onValueChange={value => handleInputChange("projectType", value)}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Track</SelectItem>
                        <SelectItem value="ep">EP</SelectItem>
                        <SelectItem value="album">Album</SelectItem>
                        <SelectItem value="mixtape">Mixtape</SelectItem>
                        <SelectItem value="commercial">Commercial Work</SelectItem>
                        <SelectItem value="learning">Learning/Skill Development</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="consultationType" className="text-gray-300">
                      Consultation Type *
                    </Label>
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Select
                        value={formData.consultationType}
                        onValueChange={value => handleInputChange("consultationType", value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white pl-10">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video Call</SelectItem>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="in-person">In-Person (LA Area)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="duration" className="text-gray-300">
                      Session Duration *
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Select
                        value={formData.duration}
                        onValueChange={value => handleInputChange("duration", value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white pl-10">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes - $75</SelectItem>
                          <SelectItem value="60">60 minutes - $150</SelectItem>
                          <SelectItem value="90">90 minutes - $200</SelectItem>
                          <SelectItem value="monthly">Monthly Mentorship - $400/mo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredDate" className="text-gray-300">
                      Preferred Date *
                    </Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      required
                      value={formData.preferredDate}
                      onChange={e => handleInputChange("preferredDate", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="preferredTime" className="text-gray-300">
                      Preferred Time *
                    </Label>
                    <Input
                      id="preferredTime"
                      type="time"
                      required
                      value={formData.preferredTime}
                      onChange={e => handleInputChange("preferredTime", e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="goals" className="text-gray-300">
                    Your Goals *
                  </Label>
                  <Textarea
                    id="goals"
                    required
                    value={formData.goals}
                    onChange={e => handleInputChange("goals", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="What do you want to achieve? (improve mixing, learn new techniques, career guidance, etc.)"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="challenges" className="text-gray-300">
                    Current Challenges
                  </Label>
                  <Textarea
                    id="challenges"
                    value={formData.challenges}
                    onChange={e => handleInputChange("challenges", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="What specific challenges are you facing in your production journey?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-gray-300">
                    Additional Information
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={e => handleInputChange("message", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Any additional details about your project or specific topics you'd like to discuss..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full btn-primary text-lg py-4">
                  Book Consultation
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

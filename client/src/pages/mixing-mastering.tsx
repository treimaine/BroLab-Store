import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/convex";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { CheckCircle, Clock, Mail, Phone, Upload, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const services = [
  {
    id: "mixing",
    name: "Professional Mixing",
    price: 70,
    duration: "3-5 business days",
    description: "Professional mixing with EQ, compression, effects, and spatial processing",
    features: [
      "Professional EQ and compression",
      "Spatial processing and effects",
      "Stereo width enhancement",
      "Dynamic range optimization",
      "Up to 3 revisions included",
      "Stems delivery available",
    ],
  },
  {
    id: "mastering",
    name: "Audio Mastering",
    price: 50,
    duration: "1-2 business days",
    description: "Professional mastering for streaming platforms and distribution",
    features: [
      "Loudness optimization",
      "Frequency balance correction",
      "Streaming platform compliance",
      "Multiple format delivery",
      "Reference track matching",
      "Quality assurance check",
    ],
  },
  {
    id: "mixing-mastering",
    name: "Mixing + Mastering",
    price: 150,
    duration: "4-6 business days",
    description: "Complete mixing and mastering package for your track",
    features: [
      "Everything in mixing package",
      "Everything in mastering package",
      "Seamless workflow integration",
      "Priority turnaround time",
      "Extended revision period",
      "Bonus stems package",
    ],
  },
];

const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

export default function MixingMastering() {
  const [, setLocation] = useLocation();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : "skip"
  );

  const [selectedService, setSelectedService] = useState("mixing-mastering");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    timeSlot: "",
    projectDetails: "",
    trackCount: "",
    genre: "",
    reference: "",
    specialRequests: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-fill form data when user data is available
  useEffect(() => {
    if (clerkLoaded && clerkUser && convexUser) {
      setFormData(prev => ({
        ...prev,
        name:
          convexUser.firstName && convexUser.lastName
            ? `${convexUser.firstName} ${convexUser.lastName}`.trim()
            : clerkUser.fullName || prev.name,
        email: convexUser.email || clerkUser.emailAddresses[0]?.emailAddress || prev.email,
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || prev.phone,
      }));
    }
  }, [clerkLoaded, clerkUser, convexUser]);

  const selectedServiceData = services.find(s => s.id === selectedService);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create reservation first
      const reservationResponse = await apiRequest("POST", "/api/reservations", {
        service: selectedService,
        ...formData,
        price: selectedServiceData?.price,
        clerkUserId: clerkUser?.id,
        convexUserId: convexUser?._id,
      });

      if (reservationResponse.ok) {
        const reservationData = await reservationResponse.json();
        
        // Create payment intent for the service
        const paymentResponse = await apiRequest("POST", "/api/payment/stripe/create-payment-intent", {
          amount: selectedServiceData?.price || 0,
          currency: "usd",
          metadata: {
            reservationId: reservationData.id,
            service: selectedService,
            customerName: formData.name,
            customerEmail: formData.email,
          },
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          
          // Store payment info in multi-services format
          const pendingPayment = {
            clientSecret: paymentData.clientSecret,
            service: selectedService,
            serviceName: selectedServiceData?.name || 'Mixing & Mastering',
            serviceDetails: formData.projectDetails,
            price: selectedServiceData?.price || 0,
            quantity: 1,
            reservationId: reservationData.id,
          };

          // Add to existing services array
          const existingServices = JSON.parse(sessionStorage.getItem('pendingServices') || '[]');
          const updatedServices = [...existingServices, pendingPayment];
          sessionStorage.setItem('pendingServices', JSON.stringify(updatedServices));
          
          toast({
            title: "Service Added!",
            description: "Your mixing & mastering service has been added to checkout.",
          });
          
          setLocation("/checkout");
        } else {
          throw new Error("Failed to create payment intent");
        }
      } else {
        throw new Error("Failed to create reservation");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="Mixing & Mastering"
        subtitle="Professional audio engineering services to make your music sound radio-ready. Get professional mixing and mastering from industry experts."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* User Status Indicator */}
        {!clerkUser && (
          <div className="mb-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-center">
              💡 <strong>Tip:</strong> Sign in to auto-fill your contact information and track your
              orders.
            </p>
          </div>
        )}

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {services.map(service => (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                selectedService === service.id
                  ? "card-dark ring-2 ring-[var(--accent-purple)]"
                  : "card-dark"
              }`}
              onClick={() => setSelectedService(service.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white">{service.name}</CardTitle>
                  <Badge className="bg-[var(--accent-purple)] text-white">${service.price}</Badge>
                </div>
                <div className="flex items-center text-gray-400 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  {service.duration}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Booking Form */}
        <Card className="max-w-4xl mx-auto card-dark">
          <CardHeader>
            <CardTitle className="text-2xl text-white text-center">Reserve Your Session</CardTitle>
            <p className="text-center text-gray-300">
              Selected: {selectedServiceData?.name} - ${selectedServiceData?.price}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white">
                    Full Name *
                    {clerkUser && (
                      <span className="text-green-500 text-xs ml-2">
                        ✓ Auto-filled from your profile
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => handleInputChange("name", e.target.value)}
                      className="pl-10 bg-[var(--medium-gray)] border-gray-600 text-white"
                      placeholder={
                        clerkUser ? "Your name will be auto-filled" : "Enter your full name"
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">
                    Email *
                    {clerkUser && (
                      <span className="text-green-500 text-xs ml-2">
                        ✓ Auto-filled from your profile
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => handleInputChange("email", e.target.value)}
                      className="pl-10 bg-[var(--medium-gray)] border-gray-600 text-white"
                      placeholder={clerkUser ? "Your email will be auto-filled" : "your@email.com"}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">
                    Phone Number
                    {clerkUser?.phoneNumbers?.[0] && (
                      <span className="text-green-500 text-xs ml-2">
                        ✓ Auto-filled from your profile
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={e => handleInputChange("phone", e.target.value)}
                      className="pl-10 bg-[var(--medium-gray)] border-gray-600 text-white"
                      placeholder={
                        clerkUser?.phoneNumbers?.[0]
                          ? "Your phone will be auto-filled"
                          : "(123) 456-7890"
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Preferred Date *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={e => handleInputChange("preferredDate", e.target.value)}
                    className="bg-[var(--medium-gray)] border-gray-600 text-white"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <Label className="text-white">Preferred Time *</Label>
                  <Select
                    value={formData.timeSlot}
                    onValueChange={value => handleInputChange("timeSlot", value)}
                  >
                    <SelectTrigger className="bg-[var(--medium-gray)] border-gray-600 text-white">
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(slot => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Number of Tracks</Label>
                  <Input
                    type="number"
                    value={formData.trackCount}
                    onChange={e => handleInputChange("trackCount", e.target.value)}
                    className="bg-[var(--medium-gray)] border-gray-600 text-white"
                    placeholder="e.g., 1"
                    min="1"
                  />
                </div>

                <div>
                  <Label className="text-white">Genre</Label>
                  <Select
                    value={formData.genre}
                    onValueChange={value => handleInputChange("genre", value)}
                  >
                    <SelectTrigger className="bg-[var(--medium-gray)] border-gray-600 text-white">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hip-hop">Hip Hop</SelectItem>
                      <SelectItem value="trap">Trap</SelectItem>
                      <SelectItem value="r&b">R&B</SelectItem>
                      <SelectItem value="afrobeat">Afrobeat</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="rock">Rock</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Reference Track (Optional)</Label>
                  <Input
                    type="text"
                    value={formData.reference}
                    onChange={e => handleInputChange("reference", e.target.value)}
                    className="bg-[var(--medium-gray)] border-gray-600 text-white"
                    placeholder="Link to reference track"
                  />
                </div>
              </div>

              {/* Project Details */}
              <div>
                <Label className="text-white">Project Details *</Label>
                <Textarea
                  required
                  value={formData.projectDetails}
                  onChange={e => handleInputChange("projectDetails", e.target.value)}
                  className="bg-[var(--medium-gray)] border-gray-600 text-white"
                  placeholder="Tell us about your project, what you're looking for, and any specific requirements..."
                  rows={4}
                />
              </div>

              {/* Special Requests */}
              <div>
                <Label className="text-white">Special Requests</Label>
                <Textarea
                  value={formData.specialRequests}
                  onChange={e => handleInputChange("specialRequests", e.target.value)}
                  className="bg-[var(--medium-gray)] border-gray-600 text-white"
                  placeholder="Any special requests or additional notes..."
                  rows={3}
                />
              </div>

              {/* File Upload Section */}
              <div className="space-y-3">
                <Label className="text-white">Upload Project Files (Optional)</Label>
                <div className="border-2 border-dashed border-[var(--medium-gray)] rounded-lg p-6 text-center hover:border-[var(--accent-purple)] transition-colors">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="audio/*,.zip,.rar,.7z"
                    onChange={e => {
                      if (e.target.files) {
                        setUploadedFiles(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-[var(--accent-purple)] mx-auto mb-2" />
                    <p className="text-gray-300 font-medium">
                      Click to upload audio files or project archives
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Supports: MP3, WAV, FLAC, ZIP, RAR (Max 100MB per file)
                    </p>
                  </label>
                </div>

                {/* Display uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300 font-medium">Uploaded files:</p>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-[var(--medium-gray)] p-3 rounded"
                      >
                        <span className="text-white text-sm">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setUploadedFiles(files => files.filter((_, i) => i !== index))
                          }
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-gray-500 text-xs">
                  Note: Files will be securely stored and processed after booking confirmation. You
                  can also send files via email or cloud storage links if preferred.
                </p>
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary px-8 py-3 text-lg"
                >
                  {isSubmitting
                    ? "Submitting..."
                    : `Reserve Session - $${selectedServiceData?.price}`}
                </Button>
                <p className="text-sm text-gray-400 mt-2">
                  We'll contact you within 24 hours to confirm your booking and provide payment
                  details.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

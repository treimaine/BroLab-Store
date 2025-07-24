import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardHero } from "@/components/ui/StandardHero";
import { Calendar, Clock, Mic, User, Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
    budget: ""
  });

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/booking/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: "Booking Request Sent!",
          description: "We'll contact you within 24 hours to confirm your recording session.",
        });
        setLocation('/');
      } else {
        throw new Error('Failed to submit booking');
      }
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Please try again or contact us directly.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      <StandardHero
        title="Recording Sessions"
        subtitle="Professional studio recording with industry-standard equipment. Book your session today and bring your music to life."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Service Info */}
          <div className="space-y-6">
            <Card className="border-gray-600 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Mic className="w-5 h-5 mr-2" />
                  Recording Session Services
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
                  <p className="text-white font-bold">$200/hour</p>
                </div>
                
                <div className="p-4 bg-green-600/10 border border-green-600/20 rounded-lg">
                  <h3 className="font-semibold text-green-400 mb-2">Full Production</h3>
                  <p className="text-gray-300 text-sm mb-2">Complete song production from start to finish</p>
                  <p className="text-white font-bold">$500-2000/song</p>
                </div>

                <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">What's Included:</h4>
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
                    <Label htmlFor="name" className="text-gray-300">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white pl-10"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white pl-10"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white pl-10"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="sessionType" className="text-gray-300">Session Type *</Label>
                  <Select value={formData.sessionType} onValueChange={(value) => handleInputChange('sessionType', value)}>
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
                    <Label htmlFor="duration" className="text-gray-300">Session Duration *</Label>
                    <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="8">8 hours (Full Day)</SelectItem>
                        <SelectItem value="custom">Custom Duration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="budget" className="text-gray-300">Budget Range</Label>
                    <Select value={formData.budget} onValueChange={(value) => handleInputChange('budget', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select budget" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300-500">$300 - $500</SelectItem>
                        <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                        <SelectItem value="1000-2000">$1,000 - $2,000</SelectItem>
                        <SelectItem value="2000+">$2,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredDate" className="text-gray-300">Preferred Date *</Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      required
                      value={formData.preferredDate}
                      onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="preferredTime" className="text-gray-300">Preferred Time *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="preferredTime"
                        type="time"
                        required
                        value={formData.preferredTime}
                        onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="location" className="text-gray-300">Preferred Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white pl-10"
                      placeholder="Our studio or your location"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message" className="text-gray-300">Additional Details</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Tell us about your project, genre, number of songs, special requirements..."
                    rows={4}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-primary text-lg py-4"
                >
                  Book Recording Session
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
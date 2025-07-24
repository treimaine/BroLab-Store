import { useState } from 'react';
import { CustomBeatRequest } from '@/components/CustomBeatRequest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StandardHero } from '@/components/ui/StandardHero';
import { Music, Clock, Star, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  priority: 'standard' | 'priority' | 'express';
  additionalNotes?: string;
}

export default function CustomBeats() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequests, setSubmittedRequests] = useState<BeatRequest[]>([]);
  const { toast } = useToast();

  const handleSubmitRequest = async (request: BeatRequest) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmittedRequests(prev => [...prev, request]);
      
      toast({
        title: "Request Submitted Successfully!",
        description: `Your custom beat request has been submitted. We'll get back to you within ${
          request.priority === 'express' ? '24 hours' : 
          request.priority === 'priority' ? '2-3 days' : 
          '5-7 days'
        }.`,
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive"
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

        {/* Process Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="card-dark text-center">
            <CardContent className="p-6">
              <Music className="w-12 h-12 mx-auto mb-4 text-[var(--accent-purple)]" />
              <h3 className="text-lg font-semibold mb-2">Submit Request</h3>
              <p className="text-gray-400 text-sm">
                Tell us exactly what you're looking for with detailed specifications
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
            <CustomBeatRequest
              onSubmit={handleSubmitRequest}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Info */}
            <Card className="card-dark">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  What's Included
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
                        {request.bpm} BPM • {request.key} • ${request.budget + (
                          request.priority === 'express' ? 100 : 
                          request.priority === 'priority' ? 50 : 0
                        )}
                      </div>
                      <div className="text-xs text-[var(--accent-purple)] mt-1">
                        {request.priority === 'express' ? 'Express (1-2 days)' : 
                         request.priority === 'priority' ? 'Priority (3-5 days)' : 
                         'Standard (5-7 days)'}
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
                    Yes! 2 revisions are included to ensure you're completely satisfied
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
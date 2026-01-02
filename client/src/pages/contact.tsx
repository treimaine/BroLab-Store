import { StandardHero } from "@/components/ui/StandardHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Headphones, Mail, MapPin, MessageCircle, Music, Phone } from "lucide-react";
import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest("POST", "/api/contact", formData);
      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      <StandardHero
        title="Contact Us"
        subtitle="Ready to start your musical journey with us? Get in touch and let's create something amazing together."
      />

      {/* Contact Options */}
      <section className="py-16 bg-[var(--dark-gray)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">How Can We Help?</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Choose the best way to reach us based on your needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[var(--deep-black)] border border-[var(--medium-gray)] rounded-xl p-8 text-center hover:border-[var(--accent-purple)] transition-colors">
              <Music className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Custom Beats</h3>
              <p className="text-gray-300 text-sm">
                Need a unique sound? Let&apos;s create something tailored to your vision.
              </p>
            </div>

            <div className="bg-[var(--deep-black)] border border-[var(--medium-gray)] rounded-xl p-8 text-center hover:border-[var(--accent-purple)] transition-colors">
              <Headphones className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Licensing Help</h3>
              <p className="text-gray-300 text-sm">
                Questions about our licensing options? We&apos;ll help you choose the right fit.
              </p>
            </div>

            <div className="bg-[var(--deep-black)] border border-[var(--medium-gray)] rounded-xl p-8 text-center hover:border-[var(--accent-purple)] transition-colors">
              <MessageCircle className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">General Support</h3>
              <p className="text-gray-300 text-sm">
                Have questions about our beats or need technical assistance?
              </p>
            </div>

            <div className="bg-[var(--deep-black)] border border-[var(--medium-gray)] rounded-xl p-8 text-center hover:border-[var(--accent-purple)] transition-colors">
              <Phone className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Urgent Requests</h3>
              <p className="text-gray-300 text-sm">
                Need immediate assistance? Call us directly for priority support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-3">Independency For You By You</h2>
                <p className="text-gray-300 text-sm">
                  Share your vision with us and let&apos;s create something extraordinary together.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-300">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-[var(--deep-black)] border-[var(--medium-gray)] focus:border-[var(--accent-purple)] text-white py-2 text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-300">
                    E-mail
                  </label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-[var(--deep-black)] border-[var(--medium-gray)] focus:border-[var(--accent-purple)] text-white py-2 text-sm"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-2 text-gray-300">
                    Subject (optional)
                  </label>
                  <Input
                    id="subject"
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full bg-[var(--deep-black)] border-[var(--medium-gray)] focus:border-[var(--accent-purple)] text-white py-2 text-sm"
                    placeholder="What is this about?"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2 text-gray-300">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    required
                    className="w-full bg-[var(--deep-black)] border-[var(--medium-gray)] focus:border-[var(--accent-purple)] text-white resize-none text-sm"
                    placeholder="Tell us about your project, goals, and how we can help you..."
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary text-sm py-2 mt-4"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    <>Send</>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Info & Additional Content */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-[var(--deep-black)] rounded-lg">
                    <Mail className="w-5 h-5 text-[var(--accent-purple)] mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Email Address</h3>
                      <p className="text-gray-300">contact@brolabentertainment.com</p>
                      <p className="text-xs text-gray-400 mt-1">Best for detailed inquiries</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-[var(--deep-black)] rounded-lg">
                    <Phone className="w-5 h-5 text-[var(--accent-purple)] mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Phone Numbers</h3>
                      <p className="text-gray-300">(+33) 7 50 47 13 17</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Available during business hours (CET)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-[var(--deep-black)] rounded-lg">
                    <MapPin className="w-5 h-5 text-[var(--accent-purple)] mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Physical Address</h3>
                      <p className="text-gray-300">LILLE, FR</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Studio visits by appointment only
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Preview */}
              <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-6">
                <h3 className="text-lg font-bold mb-3">Quick Answers</h3>
                <div className="space-y-3">
                  <div className="border-b border-[var(--medium-gray)] pb-3">
                    <h4 className="font-semibold mb-1 text-sm">
                      How quickly can I get a custom beat?
                    </h4>
                    <p className="text-gray-300 text-xs">
                      Custom beats typically take 3-7 business days depending on complexity.
                    </p>
                  </div>
                  <div className="border-b border-[var(--medium-gray)] pb-3">
                    <h4 className="font-semibold mb-1 text-sm">
                      What&apos;s included with each license?
                    </h4>
                    <p className="text-gray-300 text-xs">
                      Each license includes WAV files, tracking stems, and usage rights as
                      specified.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-sm">
                      Do you offer mixing and mastering?
                    </h4>
                    <p className="text-gray-300 text-xs">
                      Yes! All our beats come professionally mixed and mastered.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

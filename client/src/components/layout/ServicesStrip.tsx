import { Music, Headphones, Mic, Settings, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';

export function ServicesStrip() {
  const services = [
    {
      icon: Headphones,
      title: 'Mixing & Mastering',
      description: 'Professional audio engineering for your tracks',
      price: 'From $50',
      features: ['Professional Mix', 'Radio-Ready Master', '2 Revisions'],
      link: '/mixing-mastering',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Mic,
      title: 'Recording Sessions',
      description: 'Book studio time with professional engineers',
      price: 'From $100/hr',
      features: ['Professional Studio', 'Experienced Engineers', 'All Equipment Included'],
      link: '/recording-sessions',
      color: 'from-blue-500 to-purple-500'
    },
    {
      icon: Music,
      title: 'Custom Beats',
      description: 'Get exclusive beats made just for you',
      price: 'From $200',
      features: ['100% Exclusive', 'Custom Made', 'Full Rights Included'],
      link: '/custom-beats',
      color: 'from-green-500 to-blue-500'
    },
    {
      icon: Settings,
      title: 'Production Consultation',
      description: 'One-on-one guidance from industry professionals',
      price: 'From $75/hr',
      features: ['Career Guidance', 'Technical Advice', 'Industry Insights'],
      link: '/production-consultation',
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-[var(--deep-black)] via-[var(--dark-gray)] to-[var(--deep-black)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 rounded-full px-4 py-2 mb-6">
            <Star className="w-4 h-4 text-[var(--accent-purple)]" />
            <span className="text-[var(--accent-purple)] font-medium">Professional Services</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Take Your Music to the
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)]">
              Next Level
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Beyond beats, we offer comprehensive music production services to help you create professional-quality music
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card 
                key={service.title}
                className="bg-[var(--dark-gray)] border-[var(--medium-gray)] hover:border-[var(--accent-purple)] transition-all duration-300 group overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                  <p className="text-gray-400 mb-4 text-sm leading-relaxed">{service.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 bg-[var(--accent-purple)] rounded-full mr-2" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[var(--accent-purple)]">
                      {service.price}
                    </span>
                    <Link href={service.link}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white group-hover:scale-105 transition-all duration-300"
                      >
                        <span className="mr-1">Book</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-[var(--accent-purple)]/10 to-[var(--accent-cyan)]/10 border border-[var(--accent-purple)]/20 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-4">
            Need Something Custom?
          </h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Can't find exactly what you're looking for? Get in touch and we'll create a custom package tailored to your specific needs and budget.
          </p>
          <Link href="/contact">
            <Button className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80 text-white px-8 py-3">
              <Mic className="w-4 h-4 mr-2" />
              Get Custom Quote
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
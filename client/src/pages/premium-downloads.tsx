import { ProtectedPage } from "@/components/auth/AuthenticatedContent";
import { StandardHero } from "@/components/ui/StandardHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Music, Star, Zap } from "lucide-react";

export default function PremiumDownloads() {
  return (
    <ProtectedPage feature="unlimited_downloads">
      <div className="min-h-screen bg-[var(--deep-black)]">
        <StandardHero
          title="Premium Downloads"
          subtitle="Access unlimited high-quality beats with exclusive licenses"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Premium Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="card-dark">
              <CardHeader>
                <div className="w-12 h-12 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mb-4">
                  <Download className="w-6 h-6 text-[var(--accent-purple)]" />
                </div>
                <CardTitle className="text-white">Unlimited Downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Download as many beats as you need for your projects without any monthly limits.
                </p>
              </CardContent>
            </Card>

            <Card className="card-dark">
              <CardHeader>
                <div className="w-12 h-12 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mb-4">
                  <Music className="w-6 h-6 text-[var(--accent-purple)]" />
                </div>
                <CardTitle className="text-white">All Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Get beats in WAV, MP3, and STEM formats for maximum flexibility in your
                  productions.
                </p>
              </CardContent>
            </Card>

            <Card className="card-dark">
              <CardHeader>
                <div className="w-12 h-12 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-[var(--accent-purple)]" />
                </div>
                <CardTitle className="text-white">Exclusive License</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Full commercial rights and exclusive licenses for professional use.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Premium Content */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-8">Premium Beat Collection</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Access our exclusive collection of premium beats, carefully curated for professional
              artists and producers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Example Premium Beats */}
              {[1, 2, 3, 4, 5, 6].map(beat => (
                <Card
                  key={beat}
                  className="card-dark hover:border-[var(--accent-purple)] transition-colors"
                >
                  <CardHeader>
                    <div className="aspect-square bg-[var(--medium-gray)] rounded-lg mb-4 flex items-center justify-center">
                      <Music className="w-12 h-12 text-[var(--accent-purple)]" />
                    </div>
                    <CardTitle className="text-white">Premium Beat #{beat}</CardTitle>
                    <p className="text-gray-400 text-sm">Exclusive • High Quality</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--accent-purple)] font-semibold">
                        Free Download
                      </span>
                      <Button size="sm" className="btn-primary">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="mt-16 text-center">
            <div className="bg-[var(--medium-gray)] rounded-xl p-8">
              <div className="w-16 h-16 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-[var(--accent-purple)]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Unlock More Premium Content</h3>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">
                Upgrade to Ultimate Pass for access to exclusive beats, custom requests, and direct
                producer contact.
              </p>
              <Button className="btn-primary">Upgrade to Ultimate</Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}

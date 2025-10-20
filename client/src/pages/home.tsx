import { DiscountBanner } from "@/components/alerts/DiscountBanner";
import { HoverPlayButton } from "@/components/audio/HoverPlayButton";
import { SearchHero } from "@/components/layout/SearchHero";
import { ServicesStrip } from "@/components/layout/ServicesStrip";
import { SocialProofStrip } from "@/components/layout/SocialProofStrip";
import { SubscriberPerksStrip } from "@/components/subscriptions/SubscriberPerksStrip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { Eye, Info, Music, TrendingUp } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

export default function Home() {
  useScrollToTop();
  const { useProducts } = useWooCommerce();

  // État local pour éviter les suspensions synchrones
  const [localBeats, setLocalBeats] = useState<any[]>([]);
  const [localIsLoading, setLocalIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Utiliser useMemo pour éviter les recalculs inutiles
  const { data: beats, isLoading, error } = useProducts();

  // Synchroniser les données avec startTransition de manière plus sûre
  useEffect(() => {
    if (error) {
      console.warn("Error loading products:", error);
      startTransition(() => {
        setHasError(true);
        setLocalIsLoading(false);
      });
      return;
    }

    startTransition(() => {
      setLocalBeats(beats || []);
      setLocalIsLoading(isLoading);
      setHasError(false);
    });
  }, [beats, isLoading, error]);

  // Fonction pour vérifier si un produit a de l'audio réel
  const hasRealAudio = useMemo(
    () => (beat: any) => {
      const audioUrl =
        beat.audio_url || beat.meta_data?.find((meta: any) => meta.key === "audio_url")?.value;

      return audioUrl && audioUrl !== "/api/placeholder/audio.mp3";
    },
    []
  );

  // Get featured and trending beats avec useMemo
  const { featuredBeats, trendingBeats, trendingDisplayBeats } = useMemo(() => {
    const featured = localBeats?.slice(0, 3) || [];
    const trending = localBeats?.slice(3, 9) || [];
    const remaining = localBeats?.slice(9, 15) || [];
    const trendingDisplay = remaining.length > 0 ? remaining : trending;

    return {
      featuredBeats: featured,
      trendingBeats: trending,
      trendingDisplayBeats: trendingDisplay,
    };
  }, [localBeats]);

  // Composant de chargement optimisé
  const LoadingSkeleton = ({
    count = 3,
    className = "",
  }: {
    count?: number;
    className?: string;
  }) => (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`card-dark p-6 animate-pulse ${className}`}>
          <div className="w-full h-48 bg-[var(--medium-gray)] rounded-lg mb-4" />
          <div className="h-4 bg-[var(--medium-gray)] rounded mb-2" />
          <div className="h-3 bg-[var(--medium-gray)] rounded w-2/3" />
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      {/* Discount Banner */}
      <DiscountBanner />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-90" />
        <div className="absolute inset-0">
          <div className="w-96 h-96 bg-[var(--accent-purple)] rounded-full blur-3xl opacity-20 absolute -top-20 -right-20 animate-pulse" />
          <div className="w-80 h-80 bg-[var(--accent-cyan)] rounded-full blur-3xl opacity-15 absolute top-40 -left-20 animate-pulse delay-1000" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Independency by
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)]">
                You For You
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Premium beats crafted by top producers. License instantly and take your music to the
              next level.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/shop">
                <Button className="btn-primary text-lg px-8 py-4">
                  <Music className="w-5 h-5 mr-2" />
                  Browse Beats
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  variant="outline"
                  className="text-lg px-8 py-4 border-2 border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
                >
                  <Info className="w-5 h-5 mr-2" />
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Search Hero */}
            <div className="mt-12">
              <SearchHero />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Beats */}
      <section className="py-20 bg-[var(--deep-black)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Featured Beats</h2>
            <p className="text-xl text-gray-300">Hand-picked premium tracks from top producers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {localIsLoading || !localBeats || localBeats.length === 0 ? (
              <LoadingSkeleton count={3} />
            ) : (
              featuredBeats.map((beat: any) => (
                <Card
                  key={beat.id}
                  className="bg-[var(--dark-gray)] border-[var(--medium-gray)] overflow-hidden hover:border-[var(--accent-purple)] transition-all duration-300 group"
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={beat.images?.[0]?.src || "/api/placeholder/400/250"}
                        alt={beat.name}
                        className="w-full h-48 object-cover"
                      />
                      {hasRealAudio(beat) && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <HoverPlayButton
                            audioUrl={
                              beat.audio_url ||
                              beat.meta_data?.find((meta: any) => meta.key === "audio_url")
                                ?.value ||
                              "/api/placeholder/audio.mp3"
                            }
                            productId={beat.id.toString()}
                            productName={beat.name}
                            imageUrl={beat.images?.[0]?.src || beat.image_url || beat.image}
                            size="lg"
                          />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-[var(--accent-purple)]">
                        Featured
                      </Badge>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-2">{beat.name}</h3>
                      <p className="text-gray-400 mb-4">
                        {beat.categories?.[0]?.name ||
                          beat.categories?.find((cat: any) => cat.name)?.name ||
                          beat.meta_data?.find((meta: any) => meta.key === "genre")?.value ||
                          beat.meta_data?.find((meta: any) => meta.key === "category")?.value ||
                          beat.meta_data?.find((meta: any) => meta.key === "style")?.value ||
                          beat.attributes?.find((attr: any) => attr.name === "Genre")
                            ?.options?.[0] ||
                          beat.attributes?.find((attr: any) => attr.name === "Style")
                            ?.options?.[0] ||
                          ""}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-[var(--accent-purple)]">
                          {(() => {
                            const isFree =
                              beat.is_free ||
                              beat.tags?.some((tag: any) => tag.name.toLowerCase() === "free") ||
                              beat.price === 0 ||
                              beat.price === "0" ||
                              parseFloat(beat.price) === 0 ||
                              false;
                            return isFree ? (
                              <span className="text-[var(--accent-cyan)]">FREE</span>
                            ) : (
                              `$${beat.price || "29.99"}`
                            );
                          })()}
                        </span>
                        <Link href={`/product/${beat.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
                          >
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recently Viewed Beats */}
      {/* <section className="py-20 bg-[var(--deep-black)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RecentlyViewedBeats maxDisplay={6} />
        </div>
      </section> */}

      {/* Social Proof Strip */}
      <SocialProofStrip />

      {/* Subscriber Perks Strip */}
      <SubscriberPerksStrip />

      {/* Services Strip */}
      <ServicesStrip />

      {/* Trending Beats Grid */}
      <section className="py-20 bg-[var(--deep-black)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">Trending Now</h2>
              <p className="text-xl text-gray-300">Most popular beats this week</p>
            </div>
            <Link href="/shop">
              <Button
                variant="outline"
                className="border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localIsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card-dark p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700/50 rounded mb-2" />
                      <div className="h-3 bg-gray-700/50 rounded w-2/3" />
                    </div>
                  </div>
                </div>
                ))
              : trendingDisplayBeats.map((beat: any, index: number) => (
                <Card
                  key={beat.id}
                  className="bg-[var(--dark-gray)] border-[var(--medium-gray)] hover:border-[var(--accent-purple)] transition-all duration-300 group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <img
                          src={beat.images?.[0]?.src || "/api/placeholder/64/64"}
                          alt={beat.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        {hasRealAudio(beat) && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <HoverPlayButton
                            audioUrl={
                                  beat.audio_url ||
                                  beat.meta_data?.find((meta: any) => meta.key === "audio_url")
                                    ?.value ||
                                  "/api/placeholder/audio.mp3"
                                }
                            productId={beat.id.toString()}
                            productName={beat.name}
                            imageUrl={beat.images?.[0]?.src || beat.image_url || beat.image}
                            price={beat.price}
                            isFree={
                                  beat.is_free ||
                                  beat.tags?.some(
                                    (tag: any) => tag.name.toLowerCase() === "free"
                                  ) ||
                                  beat.price === 0 ||
                                  beat.price === "0" ||
                                  parseFloat(beat.price) === 0 ||
                                  false
                                }
                            size="sm"
                            className="bg-black bg-opacity-60 hover:bg-[var(--accent-purple)]"
                          />
                        </div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate">{beat.name}</h4>
                        <p className="text-sm text-gray-400">
                          {beat.categories?.[0]?.name ||
                              beat.categories?.find((cat: any) => cat.name)?.name ||
                              beat.meta_data?.find((meta: any) => meta.key === "genre")?.value ||
                              beat.meta_data?.find((meta: any) => meta.key === "category")?.value ||
                              beat.meta_data?.find((meta: any) => meta.key === "style")?.value ||
                              beat.attributes?.find((attr: any) => attr.name === "Genre")
                                ?.options?.[0] ||
                              beat.attributes?.find((attr: any) => attr.name === "Style")
                                ?.options?.[0] ||
                              ""}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[var(--accent-purple)] font-bold">
                            {(() => {
                                const isFree =
                                  beat.is_free ||
                                  beat.tags?.some(
                                    (tag: any) => tag.name.toLowerCase() === "free"
                                  ) ||
                                  beat.price === 0 ||
                                  beat.price === "0" ||
                                  parseFloat(beat.price) === 0 ||
                                  false;
                                return isFree ? (
                                  <span className="text-[var(--accent-cyan)]">FREE</span>
                                ) : (
                                  `$${beat.price || "29.99"}`
                                );
                              })()}
                          </span>
                          <div className="flex items-center text-xs text-gray-400">
                            <Eye className="w-3 h-3 mr-1" />
                            {Math.floor(Math.random() * 1000) + 100}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Create?</h2>
          <p className="text-xl text-white mb-8 opacity-90">
            Join thousands of artists who trust BroLab Entertainment for their music production
            needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop">
              <Button className="bg-white text-[var(--accent-purple)] hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition-colors">
                Start Shopping
              </Button>
            </Link>
            <Link href="/membership">
              <Button
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-[var(--accent-purple)] font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Subscribe
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

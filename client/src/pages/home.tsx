import { DiscountBanner } from "@/components/alerts/DiscountBanner";
import { HoverPlayButton } from "@/components/audio/HoverPlayButton";
import {
  SonaarCarouselCoverflow,
  type CarouselBeat,
} from "@/components/audio/SonaarCarouselCoverflow";
import { SearchHero } from "@/components/layout/SearchHero";
import { ServicesStrip } from "@/components/layout/ServicesStrip";
import { SocialProofStrip } from "@/components/layout/SocialProofStrip";
import { SubscriberPerksStrip } from "@/components/subscriptions/SubscriberPerksStrip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { api } from "@/lib/convex-api";
import {
  hasRealAudio as checkHasRealAudio,
  getAudioUrl,
  getFormattedPrice,
  getGenre,
  getImageUrl,
  isFreeProduct,
} from "@/utils/woocommerce-helpers";
import type { BroLabWooCommerceProduct } from "@shared/types";
import { useQuery } from "convex/react";
import { Eye, Info, Music, TrendingUp } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

interface LoadingSkeletonProps {
  readonly count?: number;
  readonly className?: string;
}

function LoadingSkeleton({
  count = 3,
  className = "",
}: Readonly<LoadingSkeletonProps>): JSX.Element {
  const skeletonKeys = Array.from({ length: count }, (_, i) => `skeleton-${Date.now()}-${i}`);

  return (
    <>
      {skeletonKeys.map(key => (
        <div key={key} className={`card-dark p-6 animate-pulse ${className}`}>
          <div className="w-full h-48 bg-[var(--medium-gray)] rounded-lg mb-4" />
          <div className="h-4 bg-[var(--medium-gray)] rounded mb-2" />
          <div className="h-3 bg-[var(--medium-gray)] rounded w-2/3" />
        </div>
      ))}
    </>
  );
}

export default function Home() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const { useProducts } = useWooCommerce();

  const [localBeats, setLocalBeats] = useState<BroLabWooCommerceProduct[]>([]);
  const [localIsLoading, setLocalIsLoading] = useState(true);

  const { data: beats, isLoading, error } = useProducts();

  // Get trending beats data from Convex (real view counts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trendingData = useQuery(api.beats.trending.getTrendingBeats as any, { limit: 12 });

  useEffect(() => {
    if (error) {
      console.warn("Error loading products:", error);
      startTransition(() => {
        setLocalIsLoading(false);
      });
      return;
    }

    startTransition(() => {
      setLocalBeats(beats || []);
      setLocalIsLoading(isLoading);
    });
  }, [beats, isLoading, error]);

  // Create a map of WordPress ID to view count from Convex data
  const viewCountMap = useMemo(() => {
    const map = new Map<number, number>();
    if (trendingData && Array.isArray(trendingData)) {
      for (const item of trendingData as Array<{ wordpressId: number; views: number }>) {
        map.set(item.wordpressId, item.views);
      }
    }
    return map;
  }, [trendingData]);

  const { featuredCarouselBeats, trendingDisplayBeats } = useMemo(() => {
    // Featured: first 6 beats
    const featured = localBeats?.slice(0, 6) || [];
    const featuredIds = new Set(featured.map(b => b.id));

    // Trending: sort by real view count, exclude featured, take top 6
    const nonFeaturedBeats = localBeats?.filter(b => !featuredIds.has(b.id)) || [];

    // Sort by views (from Convex) descending, fallback to date_created
    const sortedByViews = [...nonFeaturedBeats].sort((a, b) => {
      const viewsA = viewCountMap.get(a.id) || 0;
      const viewsB = viewCountMap.get(b.id) || 0;
      if (viewsB !== viewsA) return viewsB - viewsA;
      // Fallback: most recent first (by date_created string comparison)
      return (b.date_created || "").localeCompare(a.date_created || "");
    });

    const trendingDisplay = sortedByViews.slice(0, 6);

    // Transform to CarouselBeat format
    const carouselBeats: CarouselBeat[] = featured.map(beat => ({
      id: beat.id,
      title: beat.name,
      genre: getGenre(beat),
      price: beat.price || "0",
      imageUrl: getImageUrl(beat),
      audioUrl: checkHasRealAudio(beat) ? getAudioUrl(beat) : undefined,
      audioTracks: beat.audio_tracks?.map(track => ({
        url: track.url,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
      })),
      isFree: isFreeProduct(beat),
    }));

    return {
      featuredCarouselBeats: carouselBeats,
      trendingDisplayBeats: trendingDisplay,
    };
  }, [localBeats, viewCountMap]);

  const handleBeatSelect = useCallback(
    (beat: CarouselBeat) => {
      setLocation(`/product/${beat.id}`);
    },
    [setLocation]
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Independency by{" "}
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

      {/* Featured Beats - Coverflow Carousel */}
      <section className="py-20 bg-[var(--deep-black)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">Featured Beats</h2>
            <p className="text-xl text-gray-300">Hand-picked premium tracks from top producers</p>
          </div>

          {localIsLoading || featuredCarouselBeats.length === 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              <LoadingSkeleton count={3} />
            </div>
          ) : (
            <SonaarCarouselCoverflow
              beats={featuredCarouselBeats}
              onBeatSelect={handleBeatSelect}
              autoPlay={true}
              autoPlayInterval={6000}
            />
          )}
        </div>
      </section>

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
              ? Array.from({ length: 6 }, (_, i) => `trending-skeleton-${Date.now()}-${i}`).map(
                  key => (
                    <div key={key} className="card-dark p-4 animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-700/50 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-700/50 rounded mb-2" />
                          <div className="h-3 bg-gray-700/50 rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  )
                )
              : trendingDisplayBeats.map((beat: BroLabWooCommerceProduct) => (
                <Card
                  key={beat.id}
                  className="bg-[var(--dark-gray)] border-[var(--medium-gray)] hover:border-[var(--accent-purple)] transition-all duration-300 group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <img
                          src={getImageUrl(beat)}
                          alt={beat.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        {checkHasRealAudio(beat) && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <HoverPlayButton
                            audioUrl={getAudioUrl(beat)}
                            productId={beat.id.toString()}
                            productName={beat.name}
                            imageUrl={getImageUrl(beat)}
                            price={beat.price}
                            isFree={isFreeProduct(beat)}
                            size="sm"
                            className="bg-black bg-opacity-60 hover:bg-[var(--accent-purple)]"
                          />
                        </div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate">{beat.name}</h4>
                        <p className="text-sm text-gray-400">{getGenre(beat)}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[var(--accent-purple)] font-bold">
                            {isFreeProduct(beat) ? (
                              <span className="text-[var(--accent-cyan)]">FREE</span>
                              ) : (
                                `${getFormattedPrice(beat)}`
                              )}
                          </span>
                          <div className="flex items-center text-xs text-gray-400">
                            <Eye className="w-3 h-3 mr-1" />
                            {viewCountMap.get(beat.id) || 0}
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRecentlyViewedBeats } from "@/hooks/useRecentlyViewedBeats";
import { Clock, Trash2, X } from "lucide-react";
import React from "react";
import { BeatCard } from "./beat-card";

interface RecentlyViewedBeatsProps {
  maxDisplay?: number;
  showTitle?: boolean;
  className?: string;
}

export const RecentlyViewedBeats: React.FC<RecentlyViewedBeatsProps> = ({
  maxDisplay = 6,
  showTitle = true,
  className = "",
}) => {
  const { recentBeats, removeBeat, clearHistory, isLoading } = useRecentlyViewedBeats();

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Beats vus récemment
            </h3>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(maxDisplay)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg" />
              <div className="mt-2 space-y-2">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentBeats.length === 0) {
    return null; // Ne rien afficher si aucun beat récent
  }

  const displayedBeats = recentBeats.slice(0, maxDisplay);

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Beats vus récemment
            <Badge variant="secondary" className="ml-2">
              {recentBeats.length}
            </Badge>
          </h3>
          {recentBeats.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-gray-500 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Vider
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedBeats.map(recentBeat => {
          // Convertir RecentBeat en Beat pour BeatCard
          const beat = {
            id: recentBeat.id,
            title: recentBeat.title,
            genre: recentBeat.genre || "Unknown",
            price: recentBeat.price || 0,
            imageUrl: recentBeat.image_url || "",
            audioUrl: recentBeat.audio_url || "",
            // Valeurs par défaut pour les champs requis
            wordpress_id: recentBeat.id,
            bpm: 0,
            description: null,
            key: null,
            mood: null,
            tags: [],
            featured: false,
            downloads: 0,
            views: 0,
            duration: 0,
            is_active: true,
            created_at: new Date().toISOString(),
          };

          return (
            <div key={recentBeat.id} className="relative group">
              <BeatCard
                id={beat.id}
                title={beat.title}
                genre={beat.genre}
                bpm={beat.bpm}
                price={beat.price}
                imageUrl={beat.imageUrl || ""}
                audioUrl={beat.audioUrl || ""}
                tags={beat.tags || []}
                featured={beat.featured}
                downloads={beat.downloads}
                duration={beat.duration || undefined}
                isFree={beat.price === 0}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeBeat(recentBeat.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white text-gray-600 hover:text-red-500 p-1 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {recentBeats.length > maxDisplay && (
        <div className="text-center text-sm text-gray-500">
          +{recentBeats.length - maxDisplay} autres beats récents
        </div>
      )}
    </div>
  );
};

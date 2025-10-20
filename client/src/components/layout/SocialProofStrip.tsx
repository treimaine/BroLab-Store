import { Star, TrendingUp, Users } from 'lucide-react';

interface Artist {
  name: string;
  verified?: boolean;
}

export function SocialProofStrip() {
  const featuredArtists: Artist[] = [
    { name: "Trippie Redd", verified: true },
    { name: "Rod Wave", verified: true },
    { name: "Lil Baby", verified: true },
    { name: "Future", verified: true },
    { name: "Travis Scott", verified: true },
    { name: "Young Thug", verified: true },
    { name: "Gunna", verified: true },
    { name: "Lil Durk", verified: true }
  ];

  return (
    <div className="bg-[var(--medium-gray)] py-4 overflow-hidden border-y border-[var(--accent-purple)]/20">
      <div className="flex items-center">
        <div className="flex items-center space-x-8 scroll-animation whitespace-nowrap">
          <div className="flex items-center space-x-3">
            <Star className="w-5 h-5 text-[var(--color-gold)]" />
            <span className="text-white font-semibold">Used by:</span>
          </div>
          
          {featuredArtists.map((artist, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-gray-300">{artist.name}</span>
              {artist.verified && (
                <TrendingUp className="w-4 h-4 text-[var(--accent-purple)]" />
              )}
              {index < featuredArtists.length - 1 && (
                <span className="text-gray-500">•</span>
              )}
            </div>
          ))}
          
          <div className="flex items-center space-x-3 ml-8">
            <Users className="w-5 h-5 text-[var(--accent-cyan)]" />
            <span className="text-white font-semibold">50+ artists trust BroLab</span>
          </div>
        </div>
      </div>
    </div>
  );
}
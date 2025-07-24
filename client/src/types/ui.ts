// UI Types for external components compatibility

export interface UIBeat {
  id: number;
  wordpressId?: number;
  title: string;
  description?: string;
  genre: string;
  bpm: number;
  key?: string;
  mood?: string;
  price: number;
  audioUrl?: string;
  imageUrl?: string;
  tags?: string[];
  featured?: boolean;
  downloads?: number;
  views?: number;
  duration?: number;
  isActive?: boolean;
  createdAt?: string;
}
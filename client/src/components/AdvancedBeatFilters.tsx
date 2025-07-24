import { useState, useEffect } from 'react';
import { Filter, X, RotateCcw, Music, Clock, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AdvancedFilters {
  genres: string[];
  moods: string[];
  keys: string[];
  bpmRange: [number, number];
  timeSignature: string[];
  instruments: string[];
  producers: string[];
  tags: string[];
  duration: [number, number];
  priceRange: [number, number];
  releaseDate: string;
  popularity: string;
  stems: boolean;
  hasVocals: boolean;
  isFree: boolean;
}

export interface AdvancedBeatFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onClearAll: () => void;
  availableOptions: {
    genres: string[];
    moods: string[];
    producers: string[];
    tags: string[];
  };
}

const musicalKeys = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'
];

const timeSignatures = ['4/4', '3/4', '6/8', '7/8', '5/4'];

const instruments = [
  'Piano', 'Guitar', 'Bass', 'Strings', 'Brass', 'Woodwinds', 'Synthesizer',
  'Drums', 'Percussion', 'Vocals', 'Saxophone', 'Trumpet', 'Violin', 'Cello'
];

const moods = [
  'Energetic', 'Chill', 'Dark', 'Uplifting', 'Emotional', 'Aggressive',
  'Romantic', 'Mysterious', 'Nostalgic', 'Motivational', 'Melancholic',
  'Dreamy', 'Intense', 'Peaceful', 'Triumphant', 'Atmospheric'
];

export default function AdvancedBeatFilters({
  filters,
  onFiltersChange,
  onClearAll,
  availableOptions
}: AdvancedBeatFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    genre: true,
    musical: false,
    production: false,
    metadata: false
  });

  const updateFilter = <T extends keyof AdvancedFilters>(
    key: T,
    value: AdvancedFilters[T]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayItem = <T extends keyof Pick<AdvancedFilters, 'genres' | 'moods' | 'keys' | 'timeSignature' | 'instruments' | 'producers' | 'tags'>>(
    key: T,
    item: string
  ) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFilter(key, newArray);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.genres.length > 0) count++;
    if (filters.moods.length > 0) count++;
    if (filters.keys.length > 0) count++;
    if (filters.bpmRange[0] !== 60 || filters.bpmRange[1] !== 200) count++;
    if (filters.timeSignature.length > 0) count++;
    if (filters.instruments.length > 0) count++;
    if (filters.producers.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.duration[0] !== 60 || filters.duration[1] !== 300) count++;
    if (filters.priceRange[0] !== 0 || filters.priceRange[1] !== 500) count++;
    if (filters.releaseDate) count++;
    if (filters.popularity !== 'all') count++;
    if (filters.stems) count++;
    if (filters.hasVocals) count++;
    if (filters.isFree) count++;
    return count;
  };

  const filteredGenres = availableOptions.genres.filter(genre =>
    genre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMoods = moods.filter(mood =>
    mood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="card-dark">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filters
            {getActiveFilterCount() > 0 && (
              <Badge className="bg-[var(--accent-purple)] text-white ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search filters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-8"
          />
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Genre & Style */}
        <Collapsible open={expandedSections.genre} onOpenChange={() => toggleSection('genre')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left p-2 hover:bg-[var(--medium-gray)] rounded transition-colors">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Music className="w-4 h-4" />
              Genre & Style
            </h4>
            <div className="text-xl text-gray-400">
              {expandedSections.genre ? '−' : '+'}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Genres */}
            <div>
              <label className="form-label">Genres</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {filteredGenres.map(genre => (
                  <Badge
                    key={genre}
                    variant={filters.genres.includes(genre) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.genres.includes(genre)
                        ? 'bg-[var(--accent-purple)] text-white'
                        : 'border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]'
                    }`}
                    onClick={() => toggleArrayItem('genres', genre)}
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Moods */}
            <div>
              <label className="form-label">Moods</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {filteredMoods.map(mood => (
                  <Badge
                    key={mood}
                    variant={filters.moods.includes(mood) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.moods.includes(mood)
                        ? 'bg-[var(--accent-cyan)] text-white'
                        : 'border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]'
                    }`}
                    onClick={() => toggleArrayItem('moods', mood)}
                  >
                    {mood}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Musical Elements */}
        <Collapsible open={expandedSections.musical} onOpenChange={() => toggleSection('musical')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left p-2 hover:bg-[var(--medium-gray)] rounded transition-colors">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Music className="w-4 h-4" />
              Musical Elements
            </h4>
            <div className="text-xl text-gray-400">
              {expandedSections.musical ? '−' : '+'}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* BPM Range */}
            <div>
              <label className="form-label">
                BPM: {filters.bpmRange[0]} - {filters.bpmRange[1]}
              </label>
              <Slider
                value={filters.bpmRange}
                onValueChange={(value) => updateFilter('bpmRange', value as [number, number])}
                min={60}
                max={200}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Keys */}
            <div>
              <label className="form-label">Musical Keys</label>
              <div className="grid grid-cols-6 gap-2">
                {musicalKeys.map(key => (
                  <Badge
                    key={key}
                    variant={filters.keys.includes(key) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors text-center ${
                      filters.keys.includes(key)
                        ? 'bg-[var(--accent-purple)] text-white'
                        : 'border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]'
                    }`}
                    onClick={() => toggleArrayItem('keys', key)}
                  >
                    {key}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Time Signature */}
            <div>
              <label className="form-label">Time Signature</label>
              <div className="flex flex-wrap gap-2">
                {timeSignatures.map(sig => (
                  <Badge
                    key={sig}
                    variant={filters.timeSignature.includes(sig) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.timeSignature.includes(sig)
                        ? 'bg-[var(--accent-cyan)] text-white'
                        : 'border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]'
                    }`}
                    onClick={() => toggleArrayItem('timeSignature', sig)}
                  >
                    {sig}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Instruments */}
            <div>
              <label className="form-label">Instruments</label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {instruments.map(instrument => (
                  <Badge
                    key={instrument}
                    variant={filters.instruments.includes(instrument) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.instruments.includes(instrument)
                        ? 'bg-[var(--accent-purple)] text-white'
                        : 'border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]'
                    }`}
                    onClick={() => toggleArrayItem('instruments', instrument)}
                  >
                    {instrument}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Production Features */}
        <Collapsible open={expandedSections.production} onOpenChange={() => toggleSection('production')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left p-2 hover:bg-[var(--medium-gray)] rounded transition-colors">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Star className="w-4 h-4" />
              Production Features
            </h4>
            <div className="text-xl text-gray-400">
              {expandedSections.production ? '−' : '+'}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Duration */}
            <div>
              <label className="form-label">
                Duration: {Math.floor(filters.duration[0] / 60)}:{(filters.duration[0] % 60).toString().padStart(2, '0')} - {Math.floor(filters.duration[1] / 60)}:{(filters.duration[1] % 60).toString().padStart(2, '0')}
              </label>
              <Slider
                value={filters.duration}
                onValueChange={(value) => updateFilter('duration', value as [number, number])}
                min={60}
                max={300}
                step={15}
                className="mt-2"
              />
            </div>

            {/* Boolean Filters */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stems"
                  checked={filters.stems}
                  onCheckedChange={(checked) => updateFilter('stems', !!checked)}
                />
                <label htmlFor="stems" className="text-gray-300 text-sm cursor-pointer">
                  Stems Available
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vocals"
                  checked={filters.hasVocals}
                  onCheckedChange={(checked) => updateFilter('hasVocals', !!checked)}
                />
                <label htmlFor="vocals" className="text-gray-300 text-sm cursor-pointer">
                  Has Vocals
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="free"
                  checked={filters.isFree}
                  onCheckedChange={(checked) => updateFilter('isFree', !!checked)}
                />
                <label htmlFor="free" className="text-gray-300 text-sm cursor-pointer">
                  Free Beats Only
                </label>
              </div>
            </div>

            {/* Producers */}
            <div>
              <label className="form-label">Producers</label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {availableOptions.producers.map(producer => (
                  <Badge
                    key={producer}
                    variant={filters.producers.includes(producer) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.producers.includes(producer)
                        ? 'bg-[var(--accent-cyan)] text-white'
                        : 'border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]'
                    }`}
                    onClick={() => toggleArrayItem('producers', producer)}
                  >
                    {producer}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Metadata & Pricing */}
        <Collapsible open={expandedSections.metadata} onOpenChange={() => toggleSection('metadata')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left p-2 hover:bg-[var(--medium-gray)] rounded transition-colors">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Metadata & Pricing
            </h4>
            <div className="text-xl text-gray-400">
              {expandedSections.metadata ? '−' : '+'}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Price Range */}
            <div>
              <label className="form-label">
                Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
              </label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
                min={0}
                max={500}
                step={25}
                className="mt-2"
              />
            </div>

            {/* Release Date */}
            <div>
              <label className="form-label">Release Date</label>
              <Select value={filters.releaseDate} onValueChange={(value) => updateFilter('releaseDate', value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime">Any time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Popularity */}
            <div>
              <label className="form-label">Popularity</label>
              <Select value={filters.popularity} onValueChange={(value) => updateFilter('popularity', value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Any popularity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All beats</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="popular">Most popular</SelectItem>
                  <SelectItem value="new">New releases</SelectItem>
                  <SelectItem value="underrated">Hidden gems</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <label className="form-label">Tags</label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {availableOptions.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-[var(--accent-purple)] text-white'
                        : 'border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]'
                    }`}
                    onClick={() => toggleArrayItem('tags', tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Active Filters Summary */}
        {getActiveFilterCount() > 0 && (
          <div className="p-4 bg-[var(--medium-gray)] rounded-lg">
            <h5 className="font-medium text-white mb-2">Active Filters:</h5>
            <div className="flex flex-wrap gap-2">
              {filters.genres.map(genre => (
                <Badge key={`genre-${genre}`} className="bg-[var(--accent-purple)] text-white">
                  {genre}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => toggleArrayItem('genres', genre)}
                  />
                </Badge>
              ))}
              {filters.moods.map(mood => (
                <Badge key={`mood-${mood}`} className="bg-[var(--accent-cyan)] text-white">
                  {mood}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => toggleArrayItem('moods', mood)}
                  />
                </Badge>
              ))}
              {(filters.bpmRange[0] !== 60 || filters.bpmRange[1] !== 200) && (
                <Badge className="bg-gray-600 text-white">
                  BPM: {filters.bpmRange[0]}-{filters.bpmRange[1]}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => updateFilter('bpmRange', [60, 200])}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
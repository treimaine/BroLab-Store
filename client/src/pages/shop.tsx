import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StandardHero } from '@/components/ui/StandardHero';
import { BeatCard } from '@/components/beat-card';
import { WaveformAudioPlayer } from '@/components/WaveformAudioPlayer';
import { AddToCartButton } from '@/components/AddToCartButton';
import { BPMFilter } from '@/components/BPMFilter';
import { LazyAdvancedBeatFilters } from '@/components/LazyComponents';
import { BeatGridSkeleton, TableViewBeatsGridSkeleton } from '@/components/BeatCardSkeleton';

import { useWooCommerce } from '@/hooks/use-woocommerce';
import { useLocation } from 'wouter';


export default function Shop() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('');
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 200]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>({
    genres: [],
    moods: [],
    keys: [],
    bpmRange: [60, 200] as [number, number],
    timeSignature: [],
    instruments: [],
    producers: [],
    tags: [],
    duration: [60, 300] as [number, number],
    priceRange: [0, 500] as [number, number],
    releaseDate: '',
    popularity: 'all',
    stems: false,
    hasVocals: false,
    isFree: false,
  });

  const [sortBy, setSortBy] = useState('latest');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const { useCategories, useProducts } = useWooCommerce();
  const { data: categories } = useCategories();
  
  const getPriceRangeFilter = (range: string) => {
    switch (range) {
      case '0-25':
        return { min_price: 0, max_price: 25 };
      case '25-50':
        return { min_price: 25, max_price: 50 };
      case '50-100':
        return { min_price: 50, max_price: 100 };
      case '100+':
        return { min_price: 100 };
      default:
        return {};
    }
  };

  const { data: products, isLoading, refetch } = useProducts({
    page: currentPage,
    per_page: 12,
    search: searchTerm || undefined,
    category: selectedGenres.join(',') || undefined,
    orderby: sortBy === 'price_low' ? 'price' : sortBy === 'price_high' ? 'price' : 'date',
    order: sortBy === 'price_high' ? 'desc' : 'asc',
    ...getPriceRangeFilter(priceRange),
  });

  const handleGenreChange = (genreId: string, checked: boolean) => {
    if (checked) {
      setSelectedGenres([...selectedGenres, genreId]);
    } else {
      setSelectedGenres(selectedGenres.filter(id => id !== genreId));
    }
    setCurrentPage(1);
    refetch();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    refetch();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGenres([]);
    setPriceRange('');
    setBpmRange([60, 200]);

    setSortBy('latest');
    setCurrentPage(1);
    refetch();
  };

  const handleBPMChange = (range: [number, number]) => {
    setBpmRange(range);
    setCurrentPage(1);
    refetch();
  };



  const hasActiveFilters = searchTerm || selectedGenres.length > 0 || priceRange || 
    bpmRange[0] !== 60 || bpmRange[1] !== 200;

  // Filter products client-side for BPM and Producer tags since WooCommerce doesn't support these directly
  const filteredProducts = products?.filter((product: any) => {
    // BPM filter - check if product has BPM in metadata or tags
    if (bpmRange[0] !== 60 || bpmRange[1] !== 200) {
      const productBPM = product.meta_data?.find((meta: any) => meta.key === 'bpm')?.value ||
                         product.tags?.find((tag: any) => tag.name.match(/(\d+)\s*bpm/i))?.[1] ||
                         120; // default BPM if not found
      const bpm = parseInt(productBPM);
      if (bpm < bpmRange[0] || bpm > bpmRange[1]) {
        return false;
      }
    }



    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="Beat Shop"
        subtitle="Discover premium beats from top producers around the world. Find the perfect sound for your next hit."
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search and Sort Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-20" />
              <Input
                type="text"
                placeholder="Search beats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 form-input relative z-10"
                style={{ WebkitAppearance: 'none' }}
              />
            </div>
            <Button type="submit" className="btn-primary">
              Search
            </Button>
          </form>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 form-input">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="popularity">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="mb-6">
            <LazyAdvancedBeatFilters
              filters={advancedFilters}
              onFiltersChange={(filters) => setAdvancedFilters(filters)}
              onClearAll={() => setAdvancedFilters({
                genres: [],
                moods: [],
                keys: [],
                bpmRange: [60, 200] as [number, number],
                timeSignature: [],
                instruments: [],
                producers: [],
                tags: [],
                duration: [60, 300] as [number, number],
                priceRange: [0, 500] as [number, number],
                releaseDate: 'anytime',
                popularity: 'all',
                stems: false,
                hasVocals: false,
                isFree: false,
              })}
              availableOptions={{
                genres: categories?.map((cat: any) => cat.name) || [],
                moods: ['Energetic', 'Chill', 'Dark', 'Uplifting', 'Emotional'],
                producers: ['BroLab', 'Producer A', 'Producer B'],
                tags: ['popular', 'trending', 'new', 'exclusive']
              }}
            />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="card-dark p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-[var(--accent-purple)] hover:text-purple-400"
                >
                  Clear All
                </Button>
              </div>

              {/* Genre Filter */}
              <div className="mb-6">
                <label className="form-label">Genre</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories?.map((category: any) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`genre-${category.id}`}
                        checked={selectedGenres.includes(category.id.toString())}
                        onCheckedChange={(checked) => 
                          handleGenreChange(category.id.toString(), checked as boolean)
                        }
                      />
                      <label 
                        htmlFor={`genre-${category.id}`}
                        className="text-gray-300 text-sm cursor-pointer"
                      >
                        {category.name} ({category.count})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="mb-6">
                <label className="form-label">Price Range</label>
                <div className="space-y-2">
                  {[
                    { value: '', label: 'All Prices' },
                    { value: '0-25', label: 'Under $25' },
                    { value: '25-50', label: '$25 - $50' },
                    { value: '50-100', label: '$50 - $100' },
                    { value: '100+', label: '$100+' },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`price-${option.value}`}
                        name="price"
                        value={option.value}
                        checked={priceRange === option.value}
                        onChange={(e) => {
                          setPriceRange(e.target.value);
                          refetch();
                        }}
                        className="text-[var(--accent-purple)]"
                      />
                      <label 
                        htmlFor={`price-${option.value}`}
                        className="text-gray-300 text-sm cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* BPM Filter */}
              <div className="mb-6">
                <BPMFilter onBPMChange={handleBPMChange} initialRange={bpmRange} />
              </div>

              {/* Advanced Filters Toggle */}
              <div className="mb-6">
                <Button
                  variant={showAdvancedFilters ? 'default' : 'outline'}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filters
                  {Object.values(advancedFilters).some(v => 
                    Array.isArray(v) ? v.length > 0 : 
                    typeof v === 'boolean' ? v : 
                    v !== '' && v !== 'all'
                  ) && (
                    <Badge className="bg-[var(--accent-purple)] text-white ml-2 text-xs">
                      Active
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Producer Tag Filter */}


              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="mt-6 pt-6 border-t border-[var(--medium-gray)]">
                  <h4 className="text-white font-medium mb-3">Active Filters</h4>
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <Badge className="bg-[var(--accent-purple)] text-white">
                        Search: {searchTerm}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearchTerm('')} />
                      </Badge>
                    )}
                    {selectedGenres.map(genreId => {
                      const category = categories?.find((c: any) => c.id.toString() === genreId);
                      return (
                        <Badge key={genreId} className="bg-[var(--accent-purple)] text-white">
                          {category?.name}
                          <X className="w-3 h-3 ml-1 cursor-pointer" 
                             onClick={() => handleGenreChange(genreId, false)} />
                        </Badge>
                      );
                    })}
                    {(bpmRange[0] !== 60 || bpmRange[1] !== 200) && (
                      <Badge className="bg-[var(--accent-purple)] text-white">
                        BPM: {bpmRange[0]}-{bpmRange[1]}
                        <X className="w-3 h-3 ml-1 cursor-pointer" 
                           onClick={() => setBpmRange([60, 200])} />
                      </Badge>
                    )}

                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-300">
                {filteredProducts?.length ? `Showing ${filteredProducts.length} beats` : 'No beats found'}
              </p>
              
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="text-xs"
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="text-xs"
                >
                  Table
                </Button>
              </div>
            </div>

            {isLoading ? (
              viewMode === 'grid' ? (
                <BeatGridSkeleton count={12} />
              ) : (
                <TableViewBeatsGridSkeleton count={12} />
              )
            ) : filteredProducts?.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product: any) => (
                    <BeatCard
                      key={product.id}
                      id={product.id}
                      title={product.name}
                      genre={product.categories?.[0]?.name || 'Unknown'}
                      bpm={product.bpm || product.attributes?.find((attr: any) => attr.name === 'BPM')?.options?.[0] || 120}
                      price={product.price > 0 ? product.price : 0}
                      imageUrl={product.images?.[0]?.src}
                      audioUrl={product.audio_url || product.meta_data?.find((meta: any) => meta.key === 'audio_url')?.value}
                      isFree={product.is_free || product.tags?.some((tag: any) => tag.name.toLowerCase() === 'free') || false}
                      onViewDetails={() => setLocation(`/product/${product.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-400 bg-gray-800/30 rounded-lg">
                    <div className="col-span-1">TITLE</div>
                    <div className="col-span-4">INSTRUMENTS</div>
                    <div className="col-span-2">GENRE</div>
                    <div className="col-span-2">DURATION</div>
                    <div className="col-span-3"></div>
                  </div>

                  {/* Table Rows */}
                  {filteredProducts.map((product: any) => {
                    const audioUrl = product.audio_url || product.meta_data?.find((meta: any) => meta.key === 'audio_url')?.value || '/api/placeholder/audio.mp3';
                    const bpm = product.bpm || product.attributes?.find((attr: any) => attr.name === 'BPM')?.options?.[0] || 120;
                    const genre = product.categories?.[0]?.name || 'Hip Hop';
                    const producer = product.meta_data?.find((meta: any) => meta.key === 'producer')?.value || 'BroLab';
                    
                    return (
                      <div key={product.id} className="grid grid-cols-12 gap-4 items-center px-4 py-4 bg-gray-800/20 hover:bg-gray-800/40 rounded-lg transition-colors group">
                        {/* Thumbnail & Title */}
                        <div className="col-span-1 flex items-center space-x-3">
                          <img
                            src={product.images?.[0]?.src || '/api/placeholder/40/40'}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="min-w-0">
                            <h3 className="text-white font-medium text-sm truncate">{product.name}</h3>
                            <p className="text-gray-500 text-xs">BroLab</p>
                          </div>
                        </div>

                        {/* Waveform & Instruments */}
                        <div className="col-span-4">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-900/50 rounded-lg p-2">
                              <WaveformAudioPlayer 
                                src={audioUrl}
                                title={product.name}
                                artist="BroLab"
                                previewOnly={true}
                                showControls={true}
                                showWaveform={true}
                                className="w-full h-8"
                                key={`table-waveform-${product.id}-${audioUrl}`}
                              />
                            </div>
                          </div>
                          <p className="text-gray-400 text-xs mt-1">Beats, Drum, Heavy Bass, Pipe... Energetic, In...</p>
                        </div>

                        {/* Genre */}
                        <div className="col-span-2">
                          <span className="text-gray-300 text-sm">{genre}</span>
                        </div>

                        {/* Duration */}
                        <div className="col-span-2">
                          <span className="text-gray-300 text-sm">3:17</span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-3 flex items-center justify-end space-x-3">
                          <span className="text-[var(--accent-green)] font-bold text-lg">
                            ${(product.price / 100).toFixed(2)}
                          </span>
                          <AddToCartButton
                            product={{
                              id: product.id,
                              title: product.name,
                              name: product.name,
                              price: product.price / 100,
                              image: product.images?.[0]?.src
                            }}
                            variant="default"
                            size="sm"
                            className="bg-[var(--accent-purple)] hover:bg-purple-700 px-4 py-2 text-sm"
                          />
                          <Button variant="ghost" size="sm" className="p-2">
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>
                            </svg>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <div className="card-dark p-8">
                  <h3 className="text-xl font-bold text-white mb-2">No beats found</h3>
                  <p className="text-gray-300 mb-4">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button onClick={clearFilters} className="btn-primary">
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Pagination */}
            {filteredProducts?.length > 0 && (
              <div className="flex justify-center mt-12">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]"
                  >
                    Previous
                  </Button>
                  <Button className="btn-primary">
                    {currentPage}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

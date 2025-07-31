import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { UnifiedFilters } from "@/lib/unifiedFilters";
import { Filter, Music, RotateCcw, Star, X } from "lucide-react";
import { useState } from "react";

interface UnifiedFilterPanelProps {
  filters: UnifiedFilters;
  onFiltersChange: (filters: UnifiedFilters) => void;
  onClearAll: () => void;
  availableOptions: {
    keys: string[];
    moods: string[];
    instruments: string[];
    producers: string[];
    tags: string[];
    timeSignature: string[];
  };
  availableRanges: {
    bpm: { min: number; max: number };
    duration: { min: number; max: number };
  };
  stats: {
    totalProducts: number;
    filteredProducts: number;
    hasActiveFilters: boolean;
  };
}

export function UnifiedFilterPanel({
  filters,
  onFiltersChange,
  onClearAll,
  availableOptions,
  availableRanges,
  stats,
}: UnifiedFilterPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    server: true,
    client: false,
    advanced: false,
  });

  const updateFilter = <K extends keyof UnifiedFilters>(key: K, value: UnifiedFilters[K]) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleArrayItem = <
    K extends keyof Pick<
      UnifiedFilters,
      "keys" | "moods" | "instruments" | "producers" | "tags" | "timeSignature"
    >
  >(
    key: K,
    item: string
  ) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFilter(key, newArray as UnifiedFilters[K]);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories?.length) count++;
    if (filters.priceRange) count++;
    if (filters.bpmRange) count++;
    if (filters.keys?.length) count++;
    if (filters.moods?.length) count++;
    if (filters.instruments?.length) count++;
    if (filters.producers?.length) count++;
    if (filters.tags?.length) count++;
    if (filters.timeSignature?.length) count++;
    if (filters.duration) count++;
    if (filters.isFree !== undefined) count++;
    if (filters.hasVocals !== undefined) count++;
    if (filters.stems !== undefined) count++;
    return count;
  };

  const filteredKeys = availableOptions.keys.filter(key =>
    key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMoods = availableOptions.moods.filter(mood =>
    mood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="card-dark">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Unified Filters
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
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input pl-8"
          />
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        {/* Stats */}
        <div className="text-sm text-gray-400">
          Showing {stats.filteredProducts} of {stats.totalProducts} products
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search & Server Filters */}
        <Collapsible open={expandedSections.search} onOpenChange={() => toggleSection("search")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left p-2 hover:bg-[var(--medium-gray)] rounded transition-colors">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Search & Server Filters
            </h4>
            <div className="text-xl text-gray-400">{expandedSections.search ? "−" : "+"}</div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Search */}
            <div>
              <Label className="form-label">Search</Label>
              <Input
                placeholder="Search beats..."
                value={filters.search || ""}
                onChange={e => updateFilter("search", e.target.value)}
                className="form-input"
              />
            </div>

            {/* Sort */}
            <div>
              <Label className="form-label">Sort By</Label>
              <Select
                value={filters.sortBy || "date"}
                onValueChange={value => updateFilter("sortBy", value as UnifiedFilters["sortBy"])}
              >
                <SelectTrigger className="form-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Latest</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div>
              <Label className="form-label">Sort Order</Label>
              <Select
                value={filters.sortOrder || "desc"}
                onValueChange={value =>
                  updateFilter("sortOrder", value as UnifiedFilters["sortOrder"])
                }
              >
                <SelectTrigger className="form-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Client-Side Filters */}
        <Collapsible open={expandedSections.client} onOpenChange={() => toggleSection("client")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left p-2 hover:bg-[var(--medium-gray)] rounded transition-colors">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Music className="w-4 h-4" />
              Client-Side Filters
            </h4>
            <div className="text-xl text-gray-400">{expandedSections.client ? "−" : "+"}</div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* BPM Range */}
            <div>
              <Label className="form-label">
                BPM: {filters.bpmRange?.min || availableRanges.bpm.min} -{" "}
                {filters.bpmRange?.max || availableRanges.bpm.max}
              </Label>
              <Slider
                value={[
                  filters.bpmRange?.min || availableRanges.bpm.min,
                  filters.bpmRange?.max || availableRanges.bpm.max,
                ]}
                onValueChange={value => updateFilter("bpmRange", { min: value[0], max: value[1] })}
                min={availableRanges.bpm.min}
                max={availableRanges.bpm.max}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Keys */}
            <div>
              <Label className="form-label">Musical Keys</Label>
              <div className="grid grid-cols-6 gap-2">
                {filteredKeys.map(key => (
                  <Badge
                    key={key}
                    variant={filters.keys?.includes(key) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors text-center ${
                      filters.keys?.includes(key)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    }`}
                    onClick={() => toggleArrayItem("keys", key)}
                  >
                    {key}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Moods */}
            <div>
              <Label className="form-label">Moods</Label>
              <div className="flex flex-wrap gap-2">
                {filteredMoods.map(mood => (
                  <Badge
                    key={mood}
                    variant={filters.moods?.includes(mood) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.moods?.includes(mood)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    }`}
                    onClick={() => toggleArrayItem("moods", mood)}
                  >
                    {mood}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Instruments */}
            <div>
              <Label className="form-label">Instruments</Label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {availableOptions.instruments.map(instrument => (
                  <Badge
                    key={instrument}
                    variant={filters.instruments?.includes(instrument) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.instruments?.includes(instrument)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    }`}
                    onClick={() => toggleArrayItem("instruments", instrument)}
                  >
                    {instrument}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Producers */}
            <div>
              <Label className="form-label">Producers</Label>
              <div className="flex flex-wrap gap-2">
                {availableOptions.producers.map(producer => (
                  <Badge
                    key={producer}
                    variant={filters.producers?.includes(producer) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.producers?.includes(producer)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    }`}
                    onClick={() => toggleArrayItem("producers", producer)}
                  >
                    {producer}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="form-label">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableOptions.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant={filters.tags?.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.tags?.includes(tag)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    }`}
                    onClick={() => toggleArrayItem("tags", tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Advanced Filters */}
        <Collapsible
          open={expandedSections.advanced}
          onOpenChange={() => toggleSection("advanced")}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left p-2 hover:bg-[var(--medium-gray)] rounded transition-colors">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Star className="w-4 h-4" />
              Advanced Filters
            </h4>
            <div className="text-xl text-gray-400">{expandedSections.advanced ? "−" : "+"}</div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Time Signature */}
            <div>
              <Label className="form-label">Time Signature</Label>
              <div className="flex flex-wrap gap-2">
                {availableOptions.timeSignature.map(sig => (
                  <Badge
                    key={sig}
                    variant={filters.timeSignature?.includes(sig) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      filters.timeSignature?.includes(sig)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    }`}
                    onClick={() => toggleArrayItem("timeSignature", sig)}
                  >
                    {sig}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label className="form-label">
                Duration: {filters.duration?.min || availableRanges.duration.min}s -{" "}
                {filters.duration?.max || availableRanges.duration.max}s
              </Label>
              <Slider
                value={[
                  filters.duration?.min || availableRanges.duration.min,
                  filters.duration?.max || availableRanges.duration.max,
                ]}
                onValueChange={value => updateFilter("duration", { min: value[0], max: value[1] })}
                min={availableRanges.duration.min}
                max={availableRanges.duration.max}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Boolean Filters */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFree"
                  checked={filters.isFree === true}
                  onCheckedChange={checked => updateFilter("isFree", checked ? true : undefined)}
                />
                <Label htmlFor="isFree" className="text-sm">
                  Free Beats Only
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasVocals"
                  checked={filters.hasVocals === true}
                  onCheckedChange={checked => updateFilter("hasVocals", checked ? true : undefined)}
                />
                <Label htmlFor="hasVocals" className="text-sm">
                  With Vocals
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stems"
                  checked={filters.stems === true}
                  onCheckedChange={checked => updateFilter("stems", checked ? true : undefined)}
                />
                <Label htmlFor="stems" className="text-sm">
                  With Stems
                </Label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Active Filters Summary */}
        {getActiveFilterCount() > 0 && (
          <div className="p-4 bg-[var(--medium-gray)] rounded-lg">
            <h5 className="font-medium text-white mb-2">Active Filters:</h5>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge className="bg-[var(--accent-purple)] text-white">
                  Search: {filters.search}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => updateFilter("search", "")}
                  />
                </Badge>
              )}
              {filters.bpmRange && (
                <Badge className="bg-gray-600 text-white">
                  BPM: {filters.bpmRange.min}-{filters.bpmRange.max}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => updateFilter("bpmRange", undefined)}
                  />
                </Badge>
              )}
              {filters.keys?.map(key => (
                <Badge key={`key-${key}`} className="bg-[var(--accent-purple)] text-white">
                  {key}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => toggleArrayItem("keys", key)}
                  />
                </Badge>
              ))}
              {filters.moods?.map(mood => (
                <Badge key={`mood-${mood}`} className="bg-[var(--accent-cyan)] text-white">
                  {mood}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => toggleArrayItem("moods", mood)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

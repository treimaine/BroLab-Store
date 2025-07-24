import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface BPMFilterProps {
  onBPMChange: (range: [number, number]) => void;
  initialRange: [number, number];
}

export function BPMFilter({ onBPMChange, initialRange }: BPMFilterProps) {
  const [bpmRange, setBpmRange] = useState<[number, number]>(initialRange);
  const [minInput, setMinInput] = useState(initialRange[0].toString());
  const [maxInput, setMaxInput] = useState(initialRange[1].toString());

  useEffect(() => {
    setBpmRange(initialRange);
    setMinInput(initialRange[0].toString());
    setMaxInput(initialRange[1].toString());
  }, [initialRange]);

  const handleSliderChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setBpmRange(newRange);
    setMinInput(value[0].toString());
    setMaxInput(value[1].toString());
    onBPMChange(newRange);
  };

  const handleInputChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseInt(value) || 0;
    
    if (type === 'min') {
      setMinInput(value);
      const newRange: [number, number] = [Math.min(numValue, bpmRange[1]), bpmRange[1]];
      setBpmRange(newRange);
      onBPMChange(newRange);
    } else {
      setMaxInput(value);
      const newRange: [number, number] = [bpmRange[0], Math.max(numValue, bpmRange[0])];
      setBpmRange(newRange);
      onBPMChange(newRange);
    }
  };

  const resetBPM = () => {
    const defaultRange: [number, number] = [60, 200];
    setBpmRange(defaultRange);
    setMinInput('60');
    setMaxInput('200');
    onBPMChange(defaultRange);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="form-label">BPM Range</Label>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={resetBPM}
          className="text-gray-400 hover:text-white text-xs"
        >
          Reset
        </Button>
      </div>
      
      <div className="px-2">
        <Slider
          value={[bpmRange[0], bpmRange[1]]}
          onValueChange={handleSliderChange}
          min={60}
          max={200}
          step={1}
          className="w-full"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          min="60"
          max="200"
          value={minInput}
          onChange={(e) => handleInputChange('min', e.target.value)}
          className="form-input text-center"
          placeholder="Min"
        />
        <span className="text-gray-400 text-sm">-</span>
        <Input
          type="number"
          min="60"
          max="200"
          value={maxInput}
          onChange={(e) => handleInputChange('max', e.target.value)}
          className="form-input text-center"
          placeholder="Max"
        />
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        {bpmRange[0]} - {bpmRange[1]} BPM
      </div>
    </div>
  );
}
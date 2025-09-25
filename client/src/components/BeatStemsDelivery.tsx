import { useState } from 'react';
import { Download, FileAudio, Folder, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface StemFile {
  id: string;
  name: string;
  type: 'drums' | 'bass' | 'melody' | 'vocals' | 'fx' | 'master';
  size: string;
  downloadUrl: string;
  isReady: boolean;
}

export interface BeatStemsDeliveryProps {
  beatId: string;
  beatTitle: string;
  licenseType: 'basic' | 'premium' | 'unlimited';
  stems: StemFile[];
  onDownload: (stemId: string) => void;
  onDownloadAll: () => void;
}

export function BeatStemsDelivery({
  beatId,
  beatTitle,
  licenseType,
  stems,
  onDownload,
  onDownloadAll
}: BeatStemsDeliveryProps) {
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  
  const getStemIcon = (type: StemFile['type']) => {
    switch (type) {
      case 'drums': return '🥁';
      case 'bass': return '🔉';
      case 'melody': return '🎵';
      case 'vocals': return '🎤';
      case 'fx': return '✨';
      case 'master': return '🎧';
      default: return '🎵';
    }
  };

  const getAvailableStems = () => {
    switch (licenseType) {
      case 'basic':
        return stems.filter(stem => stem.type === 'master');
      case 'premium':
        return stems.filter(stem => ['master', 'drums', 'melody'].includes(stem.type));
      case 'unlimited':
        return stems;
      default:
        return [];
    }
  };

  const availableStems = getAvailableStems();
  const readyStems = availableStems.filter(stem => stem.isReady);

  return (
    <div className="space-y-6">
      <Card className="card-dark">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Beat Stems & Trackouts
            </CardTitle>
            <Badge className={`${
              licenseType === 'unlimited' ? 'bg-[var(--accent-purple)]' :
              licenseType === 'premium' ? 'bg-[var(--accent-cyan)]' :
              'bg-gray-600'
            } text-white`}
            >
              {licenseType.charAt(0).toUpperCase() + licenseType.slice(1)} License
            </Badge>
          </div>
          <p className="text-gray-400">
            {beatTitle} - Available stems for your license type
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--medium-gray)] rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--accent-purple)]">
                {availableStems.length}
              </div>
              <div className="text-sm text-gray-400">Available Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                {readyStems.length}
              </div>
              <div className="text-sm text-gray-400">Ready to Download</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {availableStems.reduce((total, stem) => 
                  total + parseInt(stem.size.replace(/[^\d]/g, '')), 0
                )}MB
              </div>
              <div className="text-sm text-gray-400">Total Size</div>
            </div>
          </div>

          {/* Download All Button */}
          {readyStems.length > 1 && (
            <Button
              onClick={onDownloadAll}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download All Stems ({readyStems.length} files)
            </Button>
          )}

          {/* Individual Stems */}
          <div className="space-y-3">
            {availableStems.map((stem) => (
              <div
                key={stem.id}
                className="flex items-center justify-between p-4 bg-[var(--dark-gray)] rounded-lg border border-[var(--medium-gray)]"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getStemIcon(stem.type)}</div>
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      {stem.name}
                      {stem.isReady ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <FileAudio className="w-3 h-3" />
                      {stem.size}
                      {stem.type === 'master' && (
                        <Badge variant="outline" className="text-xs">WAV + MP3</Badge>
                      )}
                      {stem.type !== 'master' && (
                        <Badge variant="outline" className="text-xs">WAV</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {downloadProgress[stem.id] && (
                    <div className="w-24">
                      <Progress value={downloadProgress[stem.id]} className="h-2" />
                    </div>
                  )}
                  
                  <Button
                    onClick={() => onDownload(stem.id)}
                    disabled={!stem.isReady || downloadProgress[stem.id] > 0}
                    size="sm"
                    className="btn-secondary"
                  >
                    {downloadProgress[stem.id] ? (
                      `${Math.round(downloadProgress[stem.id])}%`
                    ) : (
                      <>
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* License Upgrade Prompt */}
          {licenseType !== 'unlimited' && (
            <Card className="bg-gradient-to-r from-[var(--accent-purple)]/10 to-[var(--accent-cyan)]/10 border-[var(--accent-purple)]/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white mb-1">
                      Unlock More Stems
                    </h4>
                    <p className="text-sm text-gray-400">
                      {licenseType === 'basic' 
                        ? 'Upgrade to Premium or Unlimited for individual stems'
                        : 'Upgrade to Unlimited for all stems including vocals and FX'
                      }
                    </p>
                  </div>
                  <Button className="btn-primary">
                    Upgrade License
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
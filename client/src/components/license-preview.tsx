import { useState } from 'react';
import { X, Download, FileText, Shield, Music, Users, Globe, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface LicenseType {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  restrictions?: string[];
  usage: {
    streams?: string;
    sales?: string;
    radio?: boolean;
    commercial?: boolean;
    exclusive?: boolean;
  };
  files: {
    mp3?: boolean;
    wav?: boolean;
    stems?: boolean;
    trackouts?: boolean;
  };
}

interface LicensePreviewProps {
  beatTitle: string;
  producer: string;
  licenses: LicenseType[];
  isOpen: boolean;
  onClose: () => void;
  onSelectLicense: (licenseId: string) => void;
}

const defaultLicenses: LicenseType[] = [
  {
    id: 'basic',
    name: 'Basic MP3 License',
    price: 29.99,
    description: 'Perfect for demos, mixtapes, and non-commercial projects',
    features: [
      'MP3 download (320kbps)',
      'Non-commercial use only',
      'Demo and mixtape rights',
      'Basic distribution rights'
    ],
    restrictions: [
      'No commercial releases',
      'No radio play',
      'No streaming platforms',
      'Producer tag must remain'
    ],
    usage: {
      streams: 'None',
      sales: 'None',
      radio: false,
      commercial: false,
      exclusive: false
    },
    files: {
      mp3: true,
      wav: false,
      stems: false,
      trackouts: false
    }
  },
  {
    id: 'premium',
    name: 'Premium WAV License',
    price: 49.99,
    description: 'Commercial use with streaming and sales rights',
    features: [
      'WAV + MP3 downloads',
      'Commercial use allowed',
      'Streaming platform rights',
      'Radio play allowed',
      'Music video rights'
    ],
    restrictions: [
      'Producer tag included',
      'Limited to 100K streams',
      'Limited to 2K sales'
    ],
    usage: {
      streams: 'Up to 100,000',
      sales: 'Up to 2,000',
      radio: true,
      commercial: true,
      exclusive: false
    },
    files: {
      mp3: true,
      wav: true,
      stems: false,
      trackouts: false
    }
  },
  {
    id: 'unlimited',
    name: 'Unlimited License',
    price: 99.99,
    description: 'Unlimited streams and sales with stems included',
    features: [
      'WAV + MP3 downloads',
      'All stems/trackouts included',
      'Unlimited streaming',
      'Unlimited sales',
      'No producer tag',
      'Commercial sync rights'
    ],
    usage: {
      streams: 'Unlimited',
      sales: 'Unlimited',
      radio: true,
      commercial: true,
      exclusive: false
    },
    files: {
      mp3: true,
      wav: true,
      stems: true,
      trackouts: true
    }
  },

];

export default function LicensePreview({ 
  beatTitle, 
  producer, 
  licenses = defaultLicenses, 
  isOpen, 
  onClose, 
  onSelectLicense 
}: LicensePreviewProps) {
  const [selectedLicense, setSelectedLicense] = useState<string>('premium');

  const currentLicense = licenses.find(l => l.id === selectedLicense) || licenses[0];
  
  if (!currentLicense) {
    return null;
  }

  const handleSelectLicense = () => {
    onSelectLicense(selectedLicense);
    onClose();
  };

  const getLicenseIcon = (licenseId: string) => {
    switch (licenseId) {
      case 'basic': return Music;
      case 'premium': return Download;
      case 'unlimited': return Globe;
      case 'exclusive': return Shield;
      default: return FileText;
    }
  };

  const getLicenseColor = (licenseId: string) => {
    switch (licenseId) {
      case 'basic': return 'border-blue-500 bg-blue-500/10';
      case 'premium': return 'border-purple-500 bg-purple-500/10';
      case 'unlimited': return 'border-cyan-500 bg-cyan-500/10';
      case 'exclusive': return 'border-yellow-500 bg-yellow-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--dark-gray)] border-[var(--medium-gray)]">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">
            License Agreement Preview
          </DialogTitle>
          <div className="text-gray-400">
            <span className="font-medium text-white">{beatTitle}</span> by {producer}
          </div>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {/* License Selection */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Choose Your License</h3>
            <div className="space-y-3">
              {licenses.map((license) => {
                const Icon = getLicenseIcon(license.id);
                const isSelected = selectedLicense === license.id;
                
                return (
                  <Card 
                    key={license.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? `${getLicenseColor(license.id)} border-2` 
                        : 'bg-[var(--medium-gray)] border-[var(--medium-gray)] hover:border-[var(--accent-purple)]'
                    }`}
                    onClick={() => setSelectedLicense(license.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                          <span className={`font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {license.name}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-[var(--accent-purple)]">
                          ${license.price}
                        </span>
                      </div>
                      <p className={`text-sm ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}>
                        {license.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* License Details */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">License Details</h3>
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  {(() => {
                    const Icon = getLicenseIcon(currentLicense.id);
                    return <Icon className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />;
                  })()}
                  {currentLicense.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Usage Rights */}
                <div>
                  <h4 className="font-bold text-white mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-[var(--accent-purple)]" />
                    Usage Rights
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Streams:</span>
                      <span className="text-white">{currentLicense.usage.streams || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sales:</span>
                      <span className="text-white">{currentLicense.usage.sales || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Radio Play:</span>
                      <Badge variant={currentLicense.usage.radio ? "default" : "secondary"}>
                        {currentLicense.usage.radio ? 'Allowed' : 'Not Allowed'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Commercial:</span>
                      <Badge variant={currentLicense.usage.commercial ? "default" : "secondary"}>
                        {currentLicense.usage.commercial ? 'Allowed' : 'Not Allowed'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator className="bg-[var(--medium-gray)]" />

                {/* File Formats */}
                <div>
                  <h4 className="font-bold text-white mb-3 flex items-center">
                    <Download className="w-4 h-4 mr-2 text-[var(--accent-purple)]" />
                    Included Files
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentLicense.files.mp3 && (
                      <Badge className="bg-[var(--accent-purple)]">MP3 (320kbps)</Badge>
                    )}
                    {currentLicense.files.wav && (
                      <Badge className="bg-[var(--accent-cyan)]">WAV (44.1kHz)</Badge>
                    )}
                    {currentLicense.files.stems && (
                      <Badge className="bg-[var(--accent-green)]">Stems/Trackouts</Badge>
                    )}
                    {!currentLicense.files.wav && !currentLicense.files.stems && (
                      <Badge variant="secondary">MP3 Only</Badge>
                    )}
                  </div>
                </div>

                <Separator className="bg-[var(--medium-gray)]" />

                {/* Features */}
                <div>
                  <h4 className="font-bold text-white mb-3 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-[var(--accent-purple)]" />
                    License Features
                  </h4>
                  <ul className="space-y-2">
                    {currentLicense.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 bg-[var(--accent-purple)] rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Restrictions */}
                {currentLicense.restrictions && currentLicense.restrictions.length > 0 && (
                  <>
                    <Separator className="bg-[var(--medium-gray)]" />
                    <div>
                      <h4 className="font-bold text-white mb-3 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-yellow-400" />
                        Restrictions
                      </h4>
                      <ul className="space-y-2">
                        {currentLicense.restrictions.map((restriction, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-400">
                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-3"></div>
                            {restriction}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Exclusive Notice */}
                {currentLicense.usage.exclusive && (
                  <>
                    <Separator className="bg-[var(--medium-gray)]" />
                    <div className="bg-[var(--accent-purple)] bg-opacity-20 border border-[var(--accent-purple)] rounded-lg p-4">
                      <h4 className="font-bold text-white mb-2 flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Exclusive Rights
                      </h4>
                      <p className="text-sm text-gray-200">
                        This license grants you exclusive ownership of this beat. Once purchased, 
                        the beat will be removed from sale and no one else can use it.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-[var(--medium-gray)]">
          <div className="text-gray-400 text-sm">
            By purchasing, you agree to our Terms of Service and License Agreement
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={onClose} className="border-[var(--medium-gray)] text-white">
              Cancel
            </Button>
            <Button onClick={handleSelectLicense} className="btn-primary">
              License for ${currentLicense.price}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
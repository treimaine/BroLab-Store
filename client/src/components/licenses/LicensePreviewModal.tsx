import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LicenseType } from "@shared/types/Beat";
import { Download, FileText, Shield } from "lucide-react";
import { useEffect, useState } from "react";

interface LicensePreviewModalProps {
  licenseType: LicenseType;
  beatTitle: string;
  producer: string;
  onPurchase?: () => void;
}

interface LicenseDetails {
  name: string;
  description: string;
  price: number;
  features: string[];
  restrictions: string[];
  commercialUse: boolean;
  distributionLimit: string;
  creditRequired: boolean;
}

export function LicensePreviewModal({
  licenseType,
  beatTitle,
  producer,
  isOpen = false,
  onClose = () => {},
  onPurchase,
}: LicensePreviewModalProps & { isOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(isOpen);

  // Update open state when isOpen prop changes
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const licenseDetails: Record<LicenseType, LicenseDetails> = {
    [LicenseType.BASIC]: {
      name: "Basic MP3 License",
      description: "If uploading songs to YouTube, Spotify, or any other streaming platform!",
      price: 29.99,
      features: [
        "MP3 included",
        "Distribute up to 2,500 copies",
        "50,000 audio streams",
        "1 music videos",
        "Radio broadcasting rights (0 stations)",
        "Unlimited free downloads",
        "50,000 video streams",
        "For paid performances? No",
      ],
      restrictions: [
        "Producer credit required",
        "Maximum 2,500 copies distribution",
        "Maximum 50,000 audio streams",
        "No paid performances",
      ],
      commercialUse: true,
      distributionLimit: "50,000 audio streams",
      creditRequired: true,
    },
    [LicenseType.PREMIUM]: {
      name: "Premium WAV License",
      description:
        "[Most Popular] If you want the highest quality audio file + streaming license this is for you!",
      price: 49.99,
      features: [
        "MP3 + WAV included",
        "Distribute up to 2,500 copies",
        "150,000 audio streams",
        "1 music videos",
        "Radio broadcasting rights (0 stations)",
        "Unlimited free downloads",
        "150,000 video streams",
        "For paid performances? No",
      ],
      restrictions: [
        "Producer credit required",
        "Maximum 2,500 copies distribution",
        "Maximum 150,000 audio streams",
        "No paid performances",
      ],
      commercialUse: true,
      distributionLimit: "150,000 audio streams",
      creditRequired: true,
    },
    [LicenseType.UNLIMITED]: {
      name: "Unlimited License",
      description: "Better than Premium License!",
      price: 149.99,
      features: [
        "MP3 + WAV + stems included",
        "Distribute up to unlimited copies",
        "Unlimited audio streams",
        "1 music videos",
        "Radio broadcasting rights (2 stations)",
        "Unlimited free downloads",
        "Unlimited video streams",
        "For paid performances? Yes",
      ],
      restrictions: [
        "Producer credit required",
        "Beat may still be sold to other artists",
        "Producer retains ownership of original composition",
      ],
      commercialUse: true,
      distributionLimit: "Unlimited audio streams",
      creditRequired: true,
    },
  };

  const license = licenseDetails[licenseType];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
        >
          <FileText className="w-4 h-4 mr-2" />
          Preview License
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] bg-[var(--dark-gray)] border-[var(--medium-gray)] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-[var(--accent-purple)]" />
            {license.name} - {beatTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* License Overview */}
            <div className="bg-[var(--dark-gray)] p-6 rounded-lg border border-[var(--accent-purple)]/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{license.name}</h3>
                  <p className="text-gray-300">{license.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[var(--accent-purple)]">
                    ${license.price}
                  </div>
                  <Badge
                    className={`${
                      license.commercialUse ? "bg-[var(--accent-green)]" : "bg-yellow-600"
                    }`}
                  >
                    {license.commercialUse ? "Commercial Use" : "Non-Commercial"}
                  </Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Beat Title:</span>
                  <p className="text-white font-medium">{beatTitle}</p>
                </div>
                <div>
                  <span className="text-gray-400">Producer:</span>
                  <p className="text-white font-medium">{producer}</p>
                </div>
                <div>
                  <span className="text-gray-400">Distribution:</span>
                  <p className="text-white font-medium">{license.distributionLimit}</p>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div>
              <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Download className="w-5 h-5 text-[var(--accent-green)]" />
                What&apos;s Included
              </h4>
              <div className="grid gap-2">
                {license.features.map(feature => (
                  <div key={feature} className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 bg-[var(--accent-green)] rounded-full flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-[var(--medium-gray)]" />

            {/* Restrictions */}
            <div>
              <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-500" />
                Restrictions & Limitations
              </h4>
              <div className="grid gap-2">
                {license.restrictions.map(restriction => (
                  <div key={restriction} className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
                    {restriction}
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-[var(--medium-gray)]" />

            {/* Legal Terms Preview */}
            <div>
              <h4 className="text-lg font-bold text-white mb-3">License Terms (Summary)</h4>
              <div className="bg-[var(--dark-gray)] p-4 rounded-lg text-sm text-gray-300 space-y-3">
                <p>
                  <strong className="text-white">Grant of License:</strong> This license grants you
                  the non-exclusive right to use the musical composition &quot;{beatTitle}&quot;
                  produced by {producer} under the {license.name} terms specified above.
                </p>
                <p>
                  <strong className="text-white">Usage Rights:</strong>{" "}
                  {license.commercialUse
                    ? "Full commercial usage permitted including monetization, sales, and distribution."
                    : "Non-commercial use only. No monetization or commercial distribution permitted."}
                </p>
                <p>
                  <strong className="text-white">Credit Requirements:</strong>{" "}
                  {license.creditRequired
                    ? "Producer credit &quot;Prod. by BroLab Entertainment&quot; must be included in all releases and metadata."
                    : "Producer credit is optional but appreciated."}
                </p>
                <p>
                  <strong className="text-white">Distribution Limit:</strong>{" "}
                  {license.distributionLimit} permitted under this license.
                </p>
                <p>
                  <strong className="text-white">Territory:</strong> Worldwide usage permitted in
                  all territories and platforms.
                </p>
                <p className="text-xs text-gray-400 pt-2 border-t border-gray-600">
                  * This is a summary. Complete licensing agreement with full terms and conditions
                  will be provided upon purchase. License becomes effective immediately upon payment
                  confirmation.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--medium-gray)]">
          <div className="text-sm text-gray-400">
            Questions?{" "}
            <Button variant="link" className="p-0 h-auto text-[var(--accent-purple)]">
              Contact Support
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]"
            >
              Close
            </Button>
            {onPurchase && (
              <Button
                onClick={() => {
                  onPurchase();
                  onClose();
                }}
                className="bg-[var(--accent-purple)] hover:bg-purple-600 text-white"
              >
                Purchase License - ${license.price}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Music,
  Shield,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";

// BroLab license types with specific terms and pricing
export type BroLabLicenseType = "basic" | "premium" | "unlimited" | "exclusive";

export interface BroLabLicense {
  id: string;
  beatId: number;
  beatTitle: string;
  beatArtist: string;
  licenseType: BroLabLicenseType;
  price: number;
  status: "pending" | "active" | "expired" | "cancelled";
  purchaseDate: string;
  expiryDate?: string;
  downloadCount: number;
  maxDownloads: number;
  terms: {
    commercialUse: boolean;
    radioPlay: boolean;
    streamingRights: boolean;
    musicVideos: boolean;
    performanceRights: boolean;
    exclusivity: boolean;
    creditRequired: boolean;
  };
  downloadUrls: {
    mp3: string;
    wav: string;
    stems?: string;
    trackouts?: string;
  };
}

interface BroLabLicensingWorkflowProps {
  licenses: BroLabLicense[];
  onDownload: (licenseId: string, format: string) => void;
  onRenewLicense: (licenseId: string) => void;
  onUpgradeLicense: (licenseId: string, newType: BroLabLicenseType) => void;
  isLoading?: boolean;
  className?: string;
}

// License type configurations for BroLab marketplace
const LICENSE_CONFIGS: Record<
  BroLabLicenseType,
  {
    name: string;
    color: string;
    icon: React.ReactNode;
    features: string[];
    maxDownloads: number;
    price: number;
  }
> = {
  basic: {
    name: "Basic License",
    color: "bg-blue-500/20 text-blue-400",
    icon: <Music className="w-4 h-4" />,
    features: ["Non-commercial use", "Up to 2,000 streams", "MP3 format"],
    maxDownloads: 3,
    price: 29.99,
  },
  premium: {
    name: "Premium License",
    color: "bg-purple-500/20 text-purple-400",
    icon: <Star className="w-4 h-4" />,
    features: ["Commercial use", "Up to 100,000 streams", "MP3 + WAV", "Radio play"],
    maxDownloads: 10,
    price: 49.99,
  },
  unlimited: {
    name: "Unlimited License",
    color: "bg-green-500/20 text-green-400",
    icon: <Shield className="w-4 h-4" />,
    features: ["Unlimited streams", "All formats", "Music videos", "Performance rights"],
    maxDownloads: -1, // Unlimited
    price: 149.99,
  },
  exclusive: {
    name: "Exclusive License",
    color: "bg-yellow-500/20 text-yellow-400",
    icon: <CheckCircle className="w-4 h-4" />,
    features: ["Full ownership", "Exclusive rights", "All stems", "Producer credit removal"],
    maxDownloads: -1,
    price: 999.99,
  },
};

function BroLabLicenseCard({
  license,
  onDownload,
  onRenewLicense,
  onUpgradeLicense,
}: {
  license: BroLabLicense;
  onDownload: (licenseId: string, format: string) => void;
  onRenewLicense: (licenseId: string) => void;
  onUpgradeLicense: (licenseId: string, newType: BroLabLicenseType) => void;
}) {
  const config = LICENSE_CONFIGS[license.licenseType];

  const downloadProgress = useMemo(() => {
    if (license.maxDownloads === -1) return 100; // Unlimited
    return (license.downloadCount / license.maxDownloads) * 100;
  }, [license.downloadCount, license.maxDownloads]);

  const isExpiringSoon = useMemo(() => {
    if (!license.expiryDate) return false;
    const expiryDate = new Date(license.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }, [license.expiryDate]);

  const isExpired = useMemo(() => {
    if (!license.expiryDate) return false;
    return new Date(license.expiryDate) < new Date();
  }, [license.expiryDate]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="group">
      <Card
        className={cn(
          "bg-gray-900/50 border-gray-700/50 backdrop-blur-sm transition-all duration-300",
          isExpired && "border-red-500/50",
          isExpiringSoon && "border-yellow-500/50"
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-white text-sm font-medium truncate">
                {license.beatTitle}
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs">
                by {license.beatArtist}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2 ml-2">
              <Badge className={cn("text-xs", config.color)}>
                {config.icon}
                <span className="ml-1">{config.name}</span>
              </Badge>
              {isExpired && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Expired
                </Badge>
              )}
              {isExpiringSoon && (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                  <Clock className="w-3 h-3 mr-1" />
                  Expiring Soon
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 space-y-4">
          {/* Download Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Downloads Used</span>
              <span className="text-white">
                {license.downloadCount}
                {license.maxDownloads === -1 ? " (Unlimited)" : ` / ${license.maxDownloads}`}
              </span>
            </div>
            {license.maxDownloads !== -1 && (
              <Progress
                value={downloadProgress}
                className={cn(
                  "h-2",
                  downloadProgress > 80
                    ? "text-red-500"
                    : downloadProgress > 60
                      ? "text-yellow-500"
                      : "text-green-500"
                )}
              />
            )}
          </div>

          {/* License Terms */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-300">License Terms</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(license.terms).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  {value ? (
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-400" />
                  )}
                  <span className={value ? "text-green-300" : "text-red-300"}>
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Download buttons */}
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDownload(license.id, "mp3")}
                disabled={
                  isExpired ||
                  (license.maxDownloads !== -1 && license.downloadCount >= license.maxDownloads)
                }
                className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Download className="w-3 h-3 mr-1" />
                MP3
              </Button>

              {license.downloadUrls.wav && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownload(license.id, "wav")}
                  disabled={
                    isExpired ||
                    (license.maxDownloads !== -1 && license.downloadCount >= license.maxDownloads)
                  }
                  className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Download className="w-3 h-3 mr-1" />
                  WAV
                </Button>
              )}

              {license.downloadUrls.stems && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownload(license.id, "stems")}
                  disabled={isExpired}
                  className="text-xs border-purple-600 text-purple-300 hover:bg-purple-800/20"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Stems
                </Button>
              )}
            </div>

            {/* License management */}
            <div className="flex space-x-1 ml-auto">
              {isExpired && (
                <Button
                  size="sm"
                  onClick={() => onRenewLicense(license.id)}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  Renew
                </Button>
              )}

              {license.licenseType !== "exclusive" && !isExpired && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextLevel: BroLabLicenseType =
                      license.licenseType === "basic"
                        ? "premium"
                        : license.licenseType === "premium"
                          ? "unlimited"
                          : "exclusive";
                    onUpgradeLicense(license.id, nextLevel);
                  }}
                  className="text-xs border-purple-600 text-purple-300 hover:bg-purple-800/20"
                >
                  <Star className="w-3 h-3 mr-1" />
                  Upgrade
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(`/license-agreement/${license.id}`, "_blank")}
                className="text-xs text-gray-400 hover:text-white"
              >
                <FileText className="w-3 h-3 mr-1" />
                Terms
                <ExternalLink className="w-2 h-2 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function BroLabLicensingWorkflow({
  licenses,
  onDownload,
  onRenewLicense,
  onUpgradeLicense,
  isLoading = false,
  className,
}: BroLabLicensingWorkflowProps) {
  const [filterBy, setFilterBy] = useState<"all" | "active" | "expired" | "expiring">("all");

  const filteredLicenses = useMemo(() => {
    switch (filterBy) {
      case "active":
        return licenses.filter(
          l => l.status === "active" && (!l.expiryDate || new Date(l.expiryDate) > new Date())
        );
      case "expired":
        return licenses.filter(l => l.expiryDate && new Date(l.expiryDate) < new Date());
      case "expiring":
        return licenses.filter(l => {
          if (!l.expiryDate) return false;
          const daysUntilExpiry = Math.ceil(
            (new Date(l.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
        });
      default:
        return licenses;
    }
  }, [licenses, filterBy]);

  const licenseStats = useMemo(() => {
    const active = licenses.filter(l => l.status === "active").length;
    const expired = licenses.filter(
      l => l.expiryDate && new Date(l.expiryDate) < new Date()
    ).length;
    const totalValue = licenses.reduce((sum, l) => sum + l.price, 0);

    return { active, expired, totalValue, total: licenses.length };
  }, [licenses]);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <div className="h-6 bg-gray-700 rounded w-1/3 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-1/2 mb-4" />
                  <div className="h-2 bg-gray-700 rounded mb-4" />
                  <div className="flex space-x-2">
                    <div className="h-6 bg-gray-700 rounded w-16" />
                    <div className="h-6 bg-gray-700 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Beat Licenses</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage your licensed beats and download rights
              </CardDescription>
            </div>

            {/* License stats */}
            <div className="flex space-x-4 text-sm">
              <div className="text-center">
                <div className="text-white font-semibold">{licenseStats.active}</div>
                <div className="text-gray-400 text-xs">Active</div>
              </div>
              <div className="text-center">
                <div className="text-white font-semibold">
                  ${licenseStats.totalValue.toFixed(2)}
                </div>
                <div className="text-gray-400 text-xs">Total Value</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 mt-4">
            {[
              { key: "all", label: "All Licenses" },
              { key: "active", label: "Active" },
              { key: "expiring", label: "Expiring Soon" },
              { key: "expired", label: "Expired" },
            ].map(filter => (
              <Button
                key={filter.key}
                variant={filterBy === filter.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterBy(filter.key as "all" | "active" | "expired" | "expiring")}
                className={cn(
                  "text-xs",
                  filterBy === filter.key
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "border-gray-600 text-gray-300 hover:bg-gray-800"
                )}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {filteredLicenses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">
                {filterBy === "all" ? "No licenses yet" : `No ${filterBy} licenses`}
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {filterBy === "all"
                  ? "Start building your beat collection by purchasing licenses from our marketplace."
                  : `You don't have any ${filterBy} licenses at the moment.`}
              </p>
              {filterBy === "all" && (
                <Button
                  onClick={() => (window.location.href = "/shop")}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Browse Beats
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLicenses.map(license => (
                <BroLabLicenseCard
                  key={license.id}
                  license={license}
                  onDownload={onDownload}
                  onRenewLicense={onRenewLicense}
                  onUpgradeLicense={onUpgradeLicense}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

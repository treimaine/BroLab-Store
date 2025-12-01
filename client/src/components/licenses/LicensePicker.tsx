import { WooVariation } from "@/api/woocommerce";
import { Check, Download, Star } from "lucide-react";
import { useState } from "react";

interface License {
  id: number;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
  sku?: string;
  downloadable?: boolean;
  stock_status?: string;
  purchasable?: boolean;
}

interface LicensePickerProps {
  readonly variations: WooVariation[];
  readonly onSelect: (license: License) => void;
  readonly selectedLicenseId?: number;
  readonly className?: string;
}

export function LicensePicker({
  variations,
  onSelect,
  selectedLicenseId,
  className = "",
}: LicensePickerProps) {
  const [hoveredLicense, setHoveredLicense] = useState<number | null>(null);

  // Map WooCommerce variations to license format
  const mapVariationToLicense = (variation: WooVariation): License => {
    const licenseName =
      variation.attributes.find(
        attr =>
          attr.name.toLowerCase().includes("license") || attr.name.toLowerCase().includes("type")
      )?.option || "Standard License";

    // Extract features from description or set defaults based on price
    const price = Number.parseFloat(variation.price);
    let features: string[] = [];

    if (price <= 35) {
      features = [
        "MP3 included",
        "Up to 50,000 audio streams",
        "Distribute up to 2,500 copies",
        "Producer credit required",
      ];
    } else if (price <= 55) {
      features = [
        "MP3 + WAV included",
        "Up to 150,000 audio streams",
        "Distribute up to 2,500 copies",
        "Radio play permitted",
      ];
    } else {
      features = [
        "MP3 + WAV + stems included",
        "Unlimited audio streams",
        "Unlimited copies distribution",
        "Paid performances allowed",
      ];
    }

    return {
      id: variation.id,
      name: licenseName,
      price: price,
      description: variation.description || "",
      features: features,
      popular: price >= 50 && price <= 150, // Mark middle licenses as popular
      sku: variation.sku,
      downloadable: variation.downloadable,
      stock_status: variation.stock_status,
      purchasable: variation.purchasable,
    };
  };

  const licenses = variations.map(mapVariationToLicense).sort((a, b) => a.price - b.price);

  if (licenses.length === 0) {
    return (
      <div
        className={`bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-6 ${className}`}
      >
        <h3 className="text-lg font-bold mb-4">Choose Your License</h3>
        <p className="text-gray-400">No license options available for this beat.</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-6 ${className}`}
    >
      <h3 className="text-lg font-bold mb-6">Choose Your License</h3>

      <div className="grid gap-4">
        {licenses.map(license => {
          const getClassName = (): string => {
            if (selectedLicenseId === license.id) {
              return "border-[var(--accent-purple)] bg-[var(--accent-purple)]/10";
            }
            if (hoveredLicense === license.id) {
              return "border-[var(--accent-purple)]/50 bg-[var(--deep-black)]";
            }
            return "border-[var(--medium-gray)] bg-[var(--deep-black)]";
          };

          return (
            <button
              type="button"
              key={license.id}
              className={`relative border rounded-lg p-4 cursor-pointer transition-all duration-200 text-left w-full ${getClassName()}`}
              onMouseEnter={() => setHoveredLicense(license.id)}
              onMouseLeave={() => setHoveredLicense(null)}
              onClick={() => onSelect(license)}
            >
              {license.popular && (
                <div className="absolute -top-2 left-4 bg-[var(--accent-purple)] text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Most Popular
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-white">{license.name}</h4>
                  <p className="text-2xl font-bold text-[var(--accent-purple)]">${license.price}</p>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedLicenseId === license.id
                      ? "border-[var(--accent-purple)] bg-[var(--accent-purple)]"
                      : "border-gray-400"
                  }`}
                >
                  {selectedLicenseId === license.id && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {license.features.map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {license.downloadable && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Download className="w-3 h-3" />
                  Instant digital download
                </div>
              )}

              {license.stock_status !== "instock" && (
                <div className="mt-2 text-sm text-red-400">Currently out of stock</div>
              )}
            </button>
          );
        })}
      </div>

      {selectedLicenseId && (
        <div className="mt-6 p-4 bg-[var(--deep-black)] border border-[var(--accent-purple)]/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check className="w-4 h-4 text-[var(--accent-purple)]" />
            Selected: {licenses.find(l => l.id === selectedLicenseId)?.name}
          </div>
        </div>
      )}
    </div>
  );
}

export default LicensePicker;

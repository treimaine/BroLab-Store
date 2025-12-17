/**
 * Product Page Sub-Components
 * Extracted to reduce cognitive complexity
 */

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LicenseTypeEnum } from "@shared/schema";
<<<<<<< HEAD
=======
import { sanitizeHtml } from "@shared/utils/sanitize";
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
import { Download, FileText, Heart, Music, ShoppingCart } from "lucide-react";
import type { LicenseOption } from "./product-helpers";

interface ProductImageProps {
  readonly imageSrc?: string;
  readonly productName: string;
}

export function ProductImage({ imageSrc, productName }: Readonly<ProductImageProps>): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="relative aspect-square bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center overflow-hidden group">
        {imageSrc ? (
          <img src={imageSrc} alt={productName} className="w-full h-full object-cover" />
        ) : (
          <Music className="w-24 h-24 text-white/20" />
        )}
      </div>
    </div>
  );
}

interface ProductHeaderProps {
  readonly name: string;
  readonly category: string;
  readonly isFree: boolean;
  readonly price: number | string;
}

export function ProductHeader({
  name,
  category,
  isFree,
  price,
}: Readonly<ProductHeaderProps>): JSX.Element {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-2">{name}</h1>
      <p className="text-gray-300 text-lg">{category}</p>
      <div className="mt-2">
        {isFree ? (
          <span className="text-2xl font-bold text-[var(--accent-green)]">FREE</span>
        ) : (
          <span className="text-2xl font-bold text-white">${price}</span>
        )}
      </div>
    </div>
  );
}

interface ProductDescriptionProps {
  readonly description: string;
}

export function ProductDescription({
  description,
}: Readonly<ProductDescriptionProps>): JSX.Element {
  return (
    <div className="card-dark p-6">
      <h3 className="text-xl font-bold text-white mb-4">Description</h3>
      <div
        className="text-gray-300 leading-relaxed prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{
<<<<<<< HEAD
          __html: description || "No description available.",
=======
          __html: sanitizeHtml(description) || "No description available.",
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
        }}
      />
    </div>
  );
}

interface LicenseOptionsProps {
  readonly selectedLicense: LicenseTypeEnum;
  readonly onLicenseChange: (license: LicenseTypeEnum) => void;
  readonly options: LicenseOption[];
}

export function LicenseOptions({
  selectedLicense,
  onLicenseChange,
  options,
}: Readonly<LicenseOptionsProps>): JSX.Element {
  return (
    <div className="card-dark p-6">
      <h3 className="text-xl font-bold text-white mb-4">License Options</h3>
      <RadioGroup
        value={selectedLicense}
        onValueChange={(value: string) => onLicenseChange(value as LicenseTypeEnum)}
      >
        <div className="space-y-3">
          {options.map(option => (
            <div
              key={option.type}
              className="flex items-center space-x-3 p-4 bg-[var(--dark-gray)] rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
            >
              <RadioGroupItem value={option.type} id={option.type} />
              <Label htmlFor={option.type} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{option.name}</h4>
                    <p className="text-gray-400 text-sm">{option.description}</p>
                  </div>
                  <span className="text-[var(--accent-green)] font-bold text-lg">
                    ${option.price}
                  </span>
                </div>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}

interface FreeProductActionsProps {
  readonly onDownload: () => void;
  readonly onWishlistToggle: () => void;
  readonly isFavorite: boolean;
}

export function FreeProductActions({
  onDownload,
  onWishlistToggle,
  isFavorite,
}: Readonly<FreeProductActionsProps>): JSX.Element {
  return (
    <div className="flex space-x-4">
      <Button onClick={onDownload} className="flex-1 btn-primary text-lg py-4">
        <Download className="w-5 h-5 mr-2" />
        Download Now
      </Button>
      <Button
        onClick={onWishlistToggle}
        className={`flex-1 text-lg py-4 ${
          isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : "btn-secondary"
        }`}
      >
        <Heart className={`w-5 h-5 mr-2 ${isFavorite ? "fill-current" : ""}`} />
        {isFavorite ? "Remove from Wishlist" : "Add to Wishlist"}
      </Button>
    </div>
  );
}

interface PaidProductActionsProps {
  readonly onPreviewLicense: () => void;
  readonly onAddToCart: () => void;
  readonly onWishlistToggle: () => void;
  readonly isFavorite: boolean;
  readonly selectedPrice: number;
}

export function PaidProductActions({
  onPreviewLicense,
  onAddToCart,
  onWishlistToggle,
  isFavorite,
  selectedPrice,
}: Readonly<PaidProductActionsProps>): JSX.Element {
  return (
    <>
      <div className="flex space-x-4">
        <Button
          onClick={onPreviewLicense}
          variant="outline"
          className="flex-1 border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white text-lg py-4"
        >
          <FileText className="w-5 h-5 mr-2" />
          Preview License
        </Button>
        <Button onClick={onAddToCart} className="flex-1 btn-primary text-lg py-4">
          <ShoppingCart className="w-5 h-5 mr-2" />
          Add to Cart - ${selectedPrice}
        </Button>
      </div>
      <Button
        onClick={onWishlistToggle}
        className={`w-full text-lg py-4 ${
          isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : "btn-secondary"
        }`}
      >
        <Heart className={`w-5 h-5 mr-2 ${isFavorite ? "fill-current" : ""}`} />
        {isFavorite ? "Remove from Wishlist" : "Add to Wishlist"}
      </Button>
    </>
  );
}

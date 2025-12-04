import { useCartContext } from "@/components/cart/cart-provider";
import { LicensePreviewModal } from "@/components/licenses/LicensePreviewModal";
import { LazyBeatSimilarityRecommendations } from "@/components/loading/LazyComponents";
import { OpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SchemaMarkup } from "@/components/seo/SchemaMarkup";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { useClerkSync } from "@/hooks/useClerkSync";
import { useDownloads } from "@/hooks/useDownloads";
import { useWishlist } from "@/hooks/useWishlist";
import { LicensePricing, LicenseTypeEnum } from "@shared/schema";
import { LicenseType } from "@shared/types/Beat";
import { ArrowLeft, Download, FileText, Heart, Music, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { useRoute } from "wouter";

interface Tag {
  name: string;
}

interface MetaData {
  key: string;
  value: string | number | boolean | string[] | null;
}

interface SimilarProduct {
  id: number;
  name: string;
  price: number | string;
  images?: Array<{ src: string }>;
  bpm?: number;
  categories?: Array<{ name: string }>;
  meta_data?: MetaData[];
  tags?: Array<string | Tag>;
}

// Helper to convert LicenseTypeEnum to LicenseType
function getLicenseTypeEnum(license: LicenseTypeEnum): LicenseType {
  const mapping: Record<LicenseTypeEnum, LicenseType> = {
    basic: LicenseType.BASIC,
    premium: LicenseType.PREMIUM,
    unlimited: LicenseType.UNLIMITED,
  };
  return mapping[license] ?? LicenseType.BASIC;
}

// Helper to check if product is free
function checkIsFree(product: {
  is_free?: boolean;
  tags?: Array<string | Tag>;
  price?: number | string;
}): boolean {
  if (product.is_free) return true;

  const hasFreeTag = product.tags?.some((tag: string | Tag) =>
    typeof tag === "string" ? tag.toLowerCase() === "free" : tag.name.toLowerCase() === "free"
  );
  if (hasFreeTag) return true;

  if (product.price === 0 || product.price === "0") return true;

  return false;
}

// Helper to get tag name
function getTagName(tag: string | Tag): string {
  return typeof tag === "string" ? tag : tag.name;
}

// Helper to get meta value as string
function getMetaValue(metaData: MetaData[] | undefined, key: string): string | null {
  const value = metaData?.find((meta: MetaData) => meta.key === key)?.value;
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return String(value);
}

// License options configuration
const LICENSE_OPTIONS: Array<{
  type: LicenseTypeEnum;
  name: string;
  description: string;
  price: number;
}> = [
  {
    type: "basic",
    name: "Basic License (MP3)",
    description: "Up to 50,000 streams/downloads",
    price: LicensePricing.basic,
  },
  {
    type: "premium",
    name: "Premium License (WAV)",
    description: "Up to 150,000 streams/downloads",
    price: LicensePricing.premium,
  },
  {
    type: "unlimited",
    name: "Unlimited License",
    description: "Unlimited streams/downloads",
    price: LicensePricing.unlimited,
  },
];

// Loading skeleton component
function ProductLoadingSkeleton({ productId }: Readonly<{ productId: number }>): JSX.Element {
  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <SchemaMarkup type="beat" beatId={productId} />
      <OpenGraphMeta type="beat" beatId={productId} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="aspect-square bg-[var(--medium-gray)] rounded-xl" />
              <div className="card-dark h-32" />
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-[var(--medium-gray)] rounded" />
              <div className="h-6 bg-[var(--medium-gray)] rounded w-1/2" />
              <div className="card-dark h-48" />
              <div className="card-dark h-64" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Not found component
function ProductNotFound({ productId }: Readonly<{ productId: number }>): JSX.Element {
  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <SchemaMarkup type="beat" beatId={productId} />
      <OpenGraphMeta type="beat" beatId={productId} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Beat not found</h1>
          <p className="text-gray-300 mb-6">
            The beat you are looking for does not exist or may have been removed.
          </p>
          <Button onClick={() => globalThis.history.back()} className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

// Product image component
interface ProductImageProps {
  readonly product: { images?: Array<{ src: string }>; name: string };
}

function ProductImage({ product }: ProductImageProps): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="relative aspect-square bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center overflow-hidden group">
        {product.images?.[0]?.src ? (
          <img
            src={product.images[0].src}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Music className="w-24 h-24 text-white/20" />
        )}
      </div>
    </div>
  );
}

// License selector component
interface LicenseSelectorProps {
  readonly selectedLicense: LicenseTypeEnum;
  readonly onLicenseChange: (license: LicenseTypeEnum) => void;
}

function LicenseSelector({ selectedLicense, onLicenseChange }: LicenseSelectorProps): JSX.Element {
  return (
    <div className="card-dark p-6">
      <h3 className="text-xl font-bold text-white mb-4">License Options</h3>
      <RadioGroup
        value={selectedLicense}
        onValueChange={(value: string) => onLicenseChange(value as LicenseTypeEnum)}
      >
        <div className="space-y-3">
          {LICENSE_OPTIONS.map(option => (
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

// Wishlist button component
interface WishlistButtonProps {
  readonly productId: number;
  readonly isFavorite: boolean;
  readonly onToggle: () => void;
  readonly fullWidth?: boolean;
}

function WishlistButton({
  productId: _productId,
  isFavorite: isFav,
  onToggle,
  fullWidth,
}: WishlistButtonProps): JSX.Element {
  return (
    <Button
      onClick={onToggle}
      className={`${fullWidth ? "w-full" : "w-full sm:flex-1"} text-base sm:text-lg py-3 sm:py-4 min-w-0 ${
        isFav ? "bg-red-500 hover:bg-red-600 text-white" : "btn-secondary"
      }`}
    >
      <Heart className={`w-5 h-5 mr-2 flex-shrink-0 ${isFav ? "fill-current" : ""}`} />
      <span className="truncate">{isFav ? "Remove from Wishlist" : "Add to Wishlist"}</span>
    </Button>
  );
}

export default function Product(): JSX.Element {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id ? Number.parseInt(params.id, 10) : 0;
  const [selectedLicense, setSelectedLicense] = useState<LicenseTypeEnum>("basic");
  const [showLicensePreview, setShowLicensePreview] = useState(false);

  const { useProduct, useSimilarProducts } = useWooCommerce();
  const { data: product, isLoading, error, refetch } = useProduct(productId.toString());

  // Force reload data on component mount
  useEffect(() => {
    if (productId) {
      refetch();
    }
  }, [productId, refetch]);

  // Get similar product recommendations
  const genre = product?.categories?.[0]?.name;
  const { data: similarProducts, isLoading: isLoadingSimilar } = useSimilarProducts(
    productId.toString(),
    genre
  );

  const { addItem } = useCartContext();
  const { toast } = useToast();
  const { logDownload } = useDownloads();
  const { syncUser } = useClerkSync();

  const handleAddToCart = (): void => {
    if (!product) return;

    addItem({
      beatId: product.id,
      title: product.name,
      genre: product.categories?.[0]?.name || "Unknown",
      imageUrl: product.images?.[0]?.src,
      licenseType: selectedLicense,
      quantity: 1,
      isFree,
    });

    toast({
      title: "Added to Cart",
      description: `${product.name} (${selectedLicense} license) has been added to your cart.`,
    });
  };

  // Function to download free products directly
  const handleFreeDownload = async (): Promise<void> => {
    if (!product) return;

    try {
      // Sync user if necessary
      await syncUser();

      // Log download via Convex
      await logDownload({
        productId: product.id,
        productName: product.name,
        license: selectedLicense,
        price: 0,
      });

      // Trigger download success event for dashboard refresh
      globalThis.dispatchEvent(new CustomEvent("download-success"));

      // Then download the file
      const downloadUrl = product.audio_url || `/api/downloads/file/${product.id}/free`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${product.name}.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Download Started",
        description: `${product.name} is being downloaded and tracked.`,
      });
    } catch (error) {
      console.error("Download error:", error);

      // Check if it's an authentication error
      if (error instanceof Error && error.message === "AUTHENTICATION_REQUIRED") {
        toast({
          title: "Authentication Required",
          description: "Please log in to download this beat.",
          variant: "destructive",
        });
        // Optionally redirect to login page
        setTimeout(() => {
          globalThis.location.href = "/login";
        }, 2000);
      } else {
        toast({
          title: "Download Error",
          description: "There was an error processing your download.",
          variant: "destructive",
        });
      }
    }
  };

  const { addFavorite, removeFavorite, isFavorite } = useWishlist();

  const handleAddToWishlist = async (): Promise<void> => {
    if (!product) return;

    try {
      if (isFavorite(product.id)) {
        await removeFavorite(product.id);
        toast({
          title: "Removed from Wishlist",
          description: "This beat has been removed from your wishlist.",
        });
      } else {
        await addFavorite(product.id);
        toast({
          title: "Added to Wishlist",
          description: "This beat has been added to your wishlist.",
        });
      }
    } catch (error) {
      console.error("Wishlist error:", error);
    }
  };

  if (isLoading) {
    return <ProductLoadingSkeleton productId={productId} />;
  }

  if (!product || error || productId === 0 || Number.isNaN(productId)) {
    return <ProductNotFound productId={productId} />;
  }

  const isFree = checkIsFree(product);
  const selectedPrice = LicensePricing[selectedLicense];

  return (
    <>
      {showLicensePreview && (
        <LicensePreviewModal
          licenseType={getLicenseTypeEnum(selectedLicense)}
          beatTitle={product.name}
          producer="BroLab Entertainment"
          isOpen={showLicensePreview}
          onClose={() => setShowLicensePreview(false)}
        />
      )}
      <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
        <SchemaMarkup type="beat" beatId={productId} />
        <OpenGraphMeta type="beat" beatId={productId} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            onClick={() => globalThis.history.back()}
            variant="ghost"
            className="mb-6 text-white hover:text-[var(--accent-purple)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Image with Integrated Audio Preview */}
            <ProductImage product={product} />

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{product.name}</h1>
                <p className="text-gray-300 text-lg">
                  {product.categories?.[0]?.name || "Unknown"}
                </p>
                {/* Display price or FREE */}
                <div className="mt-2">
                  {isFree ? (
                    <span className="text-2xl font-bold text-[var(--accent-green)]">FREE</span>
                  ) : (
                    <span className="text-2xl font-bold text-white">${selectedPrice}</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="card-dark p-6">
                <h3 className="text-xl font-bold text-white mb-4">Description</h3>
                <div
                  className="text-gray-300 leading-relaxed prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: product.description || "No description available.",
                  }}
                />
              </div>

              {/* License Options - Only show for paid products */}
              {!isFree && (
                <LicenseSelector
                  selectedLicense={selectedLicense}
                  onLicenseChange={setSelectedLicense}
                />
              )}

              {/* Action Buttons */}
              <div className="space-y-4">
                {isFree ? (
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      onClick={handleFreeDownload}
                      className="w-full sm:flex-1 btn-primary text-base sm:text-lg py-3 sm:py-4"
                    >
                      <Download className="w-5 h-5 mr-2 flex-shrink-0" />
                      <span className="truncate">Download Now</span>
                    </Button>
                    <WishlistButton
                      productId={product.id}
                      isFavorite={isFavorite(product.id)}
                      onToggle={handleAddToWishlist}
                      fullWidth
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        onClick={() => setShowLicensePreview(true)}
                        variant="outline"
                        className="w-full sm:flex-1 border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white text-base sm:text-lg py-3 sm:py-4 min-w-0"
                      >
                        <FileText className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="truncate">Preview License</span>
                      </Button>
                      <Button
                        onClick={handleAddToCart}
                        className="w-full sm:flex-1 btn-primary text-base sm:text-lg py-3 sm:py-4 min-w-0"
                      >
                        <ShoppingCart className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="truncate">Add to Cart - ${selectedPrice}</span>
                      </Button>
                    </div>
                    <WishlistButton
                      productId={product.id}
                      isFavorite={isFavorite(product.id)}
                      onToggle={handleAddToWishlist}
                      fullWidth
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Beat Features - Only for paid products */}
          {!isFree && (
            <div className="mt-12 space-y-8">
              {/* Beat Stems Delivery section removed per user request */}

              {/* Similar Beats */}
              <LazyBeatSimilarityRecommendations
                currentBeat={{
                  id: Number(product?.id) || 1,
                  title: product?.name || "",
                  price: typeof product?.price === "number" ? product.price : 0,
                  image: product?.images?.[0]?.src || "/api/placeholder/400/400",
                  bpm: product?.bpm ?? undefined,
                  genre: product?.categories?.[0]?.name || "Unknown",
                  mood: getMetaValue(product?.meta_data, "mood"),
                  key: getMetaValue(product?.meta_data, "key"),
                  tags: product?.tags?.map(getTagName) || [],
                }}
                recommendations={
                  (similarProducts as SimilarProduct[] | undefined)?.map(similarProduct => ({
                    id: similarProduct.id,
                    title: similarProduct.name,
                    price: typeof similarProduct.price === "number" ? similarProduct.price : 0,
                    image: similarProduct.images?.[0]?.src || "/api/placeholder/400/400",
                    bpm: similarProduct.bpm ?? undefined,
                    genre: similarProduct.categories?.[0]?.name || "Unknown",
                    mood: getMetaValue(similarProduct.meta_data, "mood"),
                    key: getMetaValue(similarProduct.meta_data, "key"),
                    tags: similarProduct.tags?.map(getTagName) || [],
                  })) || []
                }
                onBeatSelect={(selectedBeat: { id: number }): void => {
                  globalThis.location.href = `/product/${selectedBeat.id}`;
                }}
                isLoading={isLoadingSimilar}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

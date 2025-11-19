import { useCartContext } from "@/components/cart/cart-provider";
import { LicensePreviewModal } from "@/components/licenses/LicensePreviewModal";
import { LazyBeatSimilarityRecommendations } from "@/components/loading/LazyComponents";
import { OpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SchemaMarkup } from "@/components/seo/SchemaMarkup";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { useClerkSync } from "@/hooks/useClerkSync";
import { useDownloads } from "@/hooks/useDownloads";
import { useWishlist } from "@/hooks/useWishlist";
import { LicensePricing, LicenseTypeEnum } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import {
  FreeProductActions,
  LicenseOptions,
  PaidProductActions,
  ProductDescription,
  ProductHeader,
  ProductImage,
} from "./product-components";
import {
  getLicenseTypeForModal,
  getMetaDataValue,
  handleDownloadError,
  isProductFree,
  mapTagsToStrings,
  transformProductToRecommendation,
  type BeatRecommendation,
  type LicenseOption,
  type WooCommerceProduct,
} from "./product-helpers";

export default function Product(): JSX.Element {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id ? Number.parseInt(params.id, 10) : 0;
  const [selectedLicense, setSelectedLicense] = useState<LicenseTypeEnum>("basic");
  const [showLicensePreview, setShowLicensePreview] = useState(false);

  const { useProduct, useSimilarProducts } = useWooCommerce();
  const { data: product, isLoading, error, refetch } = useProduct(productId.toString());

  // Force data reload on component mount
  useEffect(() => {
    if (productId) {
      refetch();
    }
  }, [productId, refetch]);

  // Get similar product recommendations
  const genre = product?.categories?.[0]?.name;
  const { data: similarProductsRaw, isLoading: isLoadingSimilar } = useSimilarProducts(
    productId.toString(),
    genre
  );

  // Transform similar products with proper typing
  const similarProducts: BeatRecommendation[] = Array.isArray(similarProductsRaw)
    ? (similarProductsRaw as WooCommerceProduct[]).map(transformProductToRecommendation)
    : [];

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
      isFree: isFree,
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

      // Download the file
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
      handleDownloadError(error, toast);
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

  if (!product || error || productId === 0 || Number.isNaN(productId)) {
    return (
      <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
        <SchemaMarkup type="beat" beatId={productId} />
        <OpenGraphMeta type="beat" beatId={productId} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Beat not found</h1>
            <p className="text-gray-300 mb-6">
              The beat you&apos;re looking for doesn&apos;t exist or may have been removed.
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

  const isFree = isProductFree(product);

  const licenseOptions: LicenseOption[] = [
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

  const selectedPrice = LicensePricing[selectedLicense];

  return (
    <>
      {showLicensePreview && (
        <LicensePreviewModal
          licenseType={getLicenseTypeForModal(selectedLicense)}
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
            <ProductImage imageSrc={product.images?.[0]?.src} productName={product.name} />

            <div className="space-y-6">
              <ProductHeader
                name={product.name}
                category={product.categories?.[0]?.name || "Unknown"}
                isFree={isFree}
                price={product.price}
              />

              <ProductDescription description={product.description} />

              {!isFree && (
                <LicenseOptions
                  selectedLicense={selectedLicense}
                  onLicenseChange={setSelectedLicense}
                  options={licenseOptions}
                />
              )}

              <div className="space-y-4">
                {isFree ? (
                  <FreeProductActions
                    onDownload={handleFreeDownload}
                    onWishlistToggle={handleAddToWishlist}
                    isFavorite={isFavorite(product.id)}
                  />
                ) : (
                  <PaidProductActions
                    onPreviewLicense={() => setShowLicensePreview(true)}
                    onAddToCart={handleAddToCart}
                    onWishlistToggle={handleAddToWishlist}
                    isFavorite={isFavorite(product.id)}
                    selectedPrice={selectedPrice}
                  />
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
                  price: product?.price || 0,
                  image: product?.images?.[0]?.src || "/api/placeholder/400/400",
                  bpm: product?.bpm || null,
                  genre: product?.categories?.[0]?.name || "Unknown",
                  mood: getMetaDataValue(product?.meta_data, "mood"),
                  key: getMetaDataValue(product?.meta_data, "key"),
                  tags: mapTagsToStrings(product?.tags),
                }}
                recommendations={similarProducts}
                onBeatSelect={(beat: { id: number }) => {
                  console.log("Beat selected:", beat);
                  globalThis.location.href = `/product/${beat.id}`;
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

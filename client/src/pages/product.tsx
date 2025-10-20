import { LazyBeatSimilarityRecommendations } from "@/components/loading/LazyComponents";
import { LicensePreviewModal } from "@/components/licenses/LicensePreviewModal";
import { OpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SchemaMarkup } from "@/components/seo/SchemaMarkup";
import { useCartContext } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useWooCommerce } from "@/hooks/use-woocommerce";
// useClerkBilling supprimé - utilisation de l'interface Clerk native
import { useClerkSync } from "@/hooks/useClerkSync";
import { useDownloads } from "@/hooks/useDownloads";
import { useWishlist } from "@/hooks/useWishlist";
import { LicensePricing, LicenseTypeEnum } from "@shared/schema";
import { ArrowLeft, Download, FileText, Heart, Music, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { useRoute } from "wouter";

export default function Product() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id ? parseInt(params.id) : 0;
  const [selectedLicense, setSelectedLicense] = useState<LicenseTypeEnum>("basic");
  const [showLicensePreview, setShowLicensePreview] = useState(false);

  const { useProduct, useSimilarProducts } = useWooCommerce();
  const { data: product, isLoading, error, refetch } = useProduct(productId.toString());

  // Forcer le rechargement des données au montage du composant
  useEffect(() => {
    if (productId) {
      refetch();
    }
  }, [productId, refetch]);

  // Récupérer les recommandations de produits similaires
  const genre = product?.categories?.[0]?.name;
  const { data: similarProducts, isLoading: isLoadingSimilar } = useSimilarProducts(
    productId.toString(),
    genre
  );

  const { addItem } = useCartContext();
  const { toast } = useToast();
  const { logDownload } = useDownloads();
  // Vérification des permissions via Clerk native (à implémenter si nécessaire)
  const canDownload = (licenseType: string) => true; // Temporaire - Clerk gère les permissions
  const hasPlan = (plan: string) => false; // Temporaire - Clerk gère les plans
  const { syncUser } = useClerkSync();

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      beatId: product.id,
      title: product.name,
      genre: product.categories?.[0]?.name || "Unknown",
      imageUrl: product.images?.[0]?.src,
      licenseType: selectedLicense,
      quantity: 1,
      isFree: isFree, // Ajouter le paramètre isFree
    });

    toast({
      title: "Added to Cart",
      description: `${product.name} (${selectedLicense} license) has been added to your cart.`,
    });
  };

  // Fonction pour télécharger directement les produits gratuits
  const handleFreeDownload = async () => {
    if (!product) return;

    // Vérifier les permissions de téléchargement
    if (!canDownload(selectedLicense)) {
      toast({
        title: "Download Permission Required",
        description: `You need a ${selectedLicense} plan or higher to download this product.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Synchroniser l'utilisateur si nécessaire
      await syncUser();

      // Logger le téléchargement via Convex
      await logDownload({
        productId: product.id,
        productName: product.name,
        license: selectedLicense,
        price: 0, // Gratuit
      });

      // Trigger download success event for dashboard refresh
      window.dispatchEvent(new CustomEvent("download-success"));

      // Ensuite télécharger le fichier
      const downloadUrl = product.audio_url || `/api/downloads/file/${product.id}/free`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${product.name}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
          window.location.href = "/login";
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

  const handleAddToWishlist = async () => {
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

  const handleSelectLicense = (licenseType: string) => {
    setSelectedLicense(licenseType as LicenseTypeEnum);
    setShowLicensePreview(false);
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

  if (!product || error || productId === 0 || isNaN(productId)) {
    return (
      <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
        <SchemaMarkup type="beat" beatId={productId} />
        <OpenGraphMeta type="beat" beatId={productId} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Beat not found</h1>
            <p className="text-gray-300 mb-6">
              The beat you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => window.history.back()} className="btn-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const audioUrl =
    product.audio_url ||
    product.meta_data?.find((meta: any) => meta.key === "audio_url")?.value ||
    "/api/placeholder/audio.mp3";

  const isFree =
    product.is_free ||
    product.tags?.some((tag: any) => tag.name.toLowerCase() === "free") ||
    product.price === 0 ||
    product.price === "0" ||
    false;

  const licenseOptions = [
    {
      type: "basic" as LicenseTypeEnum,
      name: "Basic License (MP3)",
      description: "Up to 50,000 streams/downloads",
      price: LicensePricing.basic,
    },
    {
      type: "premium" as LicenseTypeEnum,
      name: "Premium License (WAV)",
      description: "Up to 150,000 streams/downloads",
      price: LicensePricing.premium,
    },
    {
      type: "unlimited" as LicenseTypeEnum,
      name: "Unlimited License",
      description: "Unlimited streams/downloads",
      price: LicensePricing.unlimited,
    },
  ];

  const selectedPrice = LicensePricing[selectedLicense];

  const handleLicenseSelect = (licenseId: string) => {
    setSelectedLicense(licenseId as LicenseTypeEnum);
  };

  return (
    <>
      {showLicensePreview && (
        <LicensePreviewModal
          licenseType={selectedLicense}
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
            onClick={() => window.history.back()}
            variant="ghost"
            className="mb-6 text-white hover:text-[var(--accent-purple)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Image with Integrated Audio Preview */}
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

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{product.name}</h1>
                <p className="text-gray-300 text-lg">
                  {product.categories?.[0]?.name || "Unknown"}
                </p>
                {/* Afficher le prix ou FREE */}
                <div className="mt-2">
                  {isFree ? (
                    <span className="text-2xl font-bold text-[var(--accent-green)]">FREE</span>
                  ) : (
                    <span className="text-2xl font-bold text-white">${product.price}</span>
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
                <div className="card-dark p-6">
                  <h3 className="text-xl font-bold text-white mb-4">License Options</h3>
                  <RadioGroup
                    value={selectedLicense}
                    onValueChange={(value: string) => setSelectedLicense(value as LicenseTypeEnum)}
                  >
                    <div className="space-y-3">
                      {licenseOptions.map(option => (
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
              )}

              {/* Action Buttons */}
              <div className="space-y-4">
                {isFree ? (
                  // Free product - Direct download button
                  <div className="flex space-x-4">
                    <Button
                      onClick={handleFreeDownload}
                      className="flex-1 btn-primary text-lg py-4"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download Now
                    </Button>
                    <Button
                      onClick={handleAddToWishlist}
                      className={`flex-1 text-lg py-4 ${
                        isFavorite(product.id)
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "btn-secondary"
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 mr-2 ${isFavorite(product.id) ? "fill-current" : ""}`}
                      />
                      {isFavorite(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                    </Button>
                  </div>
                ) : (
                  // Paid product - License options and cart
                  <>
                    <div className="flex space-x-4">
                      <Button
                        onClick={() => setShowLicensePreview(true)}
                        variant="outline"
                        className="flex-1 border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white text-lg py-4"
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        Preview License
                      </Button>
                      <Button onClick={handleAddToCart} className="flex-1 btn-primary text-lg py-4">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Add to Cart - ${selectedPrice}
                      </Button>
                    </div>
                    <Button
                      onClick={handleAddToWishlist}
                      className={`w-full text-lg py-4 ${
                        isFavorite(product.id)
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "btn-secondary"
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 mr-2 ${isFavorite(product.id) ? "fill-current" : ""}`}
                      />
                      {isFavorite(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                    </Button>
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
                  price: product?.price || 0,
                  image: product?.images?.[0]?.src || "/api/placeholder/400/400",
                  bpm: product?.bpm || null,
                  genre: product?.categories?.[0]?.name || "Unknown",
                  mood: product?.meta_data?.find((meta: any) => meta.key === "mood")?.value || null,
                  key: product?.meta_data?.find((meta: any) => meta.key === "key")?.value || null,
                  tags: product?.tags?.map((tag: any) => tag.name) || [],
                }}
                recommendations={
                  similarProducts?.map((similarProduct: any) => ({
                    id: similarProduct.id,
                    title: similarProduct.name,
                    price: similarProduct.price,
                    image: similarProduct.images?.[0]?.src || "/api/placeholder/400/400",
                    bpm: similarProduct.bpm || null,
                    genre: similarProduct.categories?.[0]?.name || "Unknown",
                    mood:
                      similarProduct.meta_data?.find((meta: any) => meta.key === "mood")?.value ||
                      null,
                    key:
                      similarProduct.meta_data?.find((meta: any) => meta.key === "key")?.value ||
                      null,
                    tags: similarProduct.tags?.map((tag: any) => tag.name) || [],
                  })) || []
                }
                onBeatSelect={(beat: { id: number }) => {
                  console.log("Beat selected:", beat);
                  // Navigate to the selected beat
                  window.location.href = `/product/${beat.id}`;
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

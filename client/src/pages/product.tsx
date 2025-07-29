import { BeatSimilarityRecommendations } from "@/components/BeatSimilarityRecommendations";
import { BeatStemsDelivery } from "@/components/BeatStemsDelivery";
import { useCartContext } from "@/components/cart-provider";
import { LicensePreviewModal } from "@/components/LicensePreviewModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WaveformAudioPlayer } from "@/components/WaveformAudioPlayer";
import { useToast } from "@/hooks/use-toast";
import { useWooCommerce } from "@/hooks/use-woocommerce";
import { useWishlist } from "@/hooks/useWishlist";
import { useAudioStore } from "@/store/useAudioStore";
import { LicensePricing, LicenseTypeEnum } from "@shared/schema";
import { ArrowLeft, FileText, Heart, Music, Pause, Play, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useRoute } from "wouter";

export default function Product() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id ? parseInt(params.id) : 0;
  const [selectedLicense, setSelectedLicense] = useState<LicenseTypeEnum>("basic");
  const [showLicensePreview, setShowLicensePreview] = useState(false);

  const { useProduct } = useWooCommerce();
  const { data: product, isLoading, error } = useProduct(productId.toString());
  const { addItem } = useCartContext();
  const { toast } = useToast();
  const { setCurrentTrack, setIsPlaying, currentTrack, isPlaying } = useAudioStore();

  const handlePreviewAudio = () => {
    if (product && audioUrl) {
      setCurrentTrack({
        id: product.id.toString(),
        title: product.name,
        artist: "BroLab",
        url: audioUrl,
        audioUrl: audioUrl,
        imageUrl: product.images?.[0]?.src || "",
      });
      setIsPlaying(true);
    }
  };

  const isCurrentTrack = currentTrack?.id === productId.toString();
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      beatId: product.id,
      title: product.name,
      genre: product.categories?.[0]?.name || "Unknown",
      imageUrl: product.images?.[0]?.src,
      licenseType: selectedLicense,
      quantity: 1,
    });

    toast({
      title: "Added to Cart",
      description: `${product.name} (${selectedLicense} license) has been added to your cart.`,
    });
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

                {/* Hover Play Button */}
                {audioUrl && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    <button
                      onClick={handlePreviewAudio}
                      className="w-20 h-20 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
                    >
                      {isCurrentlyPlaying ? (
                        <Pause className="w-8 h-8 text-gray-800" />
                      ) : (
                        <Play className="w-8 h-8 text-gray-800 ml-1" />
                      )}
                    </button>
                  </div>
                )}

                {/* Audio Preview Overlay */}
                {audioUrl && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <div className="bg-[var(--medium-gray)] rounded-lg p-4">
                      <h3 className="text-white font-medium text-lg mb-2">Audio Preview</h3>
                      <p className="text-gray-300 text-sm mb-4">BY BROLAB</p>
                      <WaveformAudioPlayer
                        src={audioUrl}
                        title={product.name}
                        artist="BroLab"
                        previewOnly={true}
                        showControls={true}
                        showWaveform={true}
                        className="w-full"
                      />
                    </div>
                  </div>
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
                    onValueChange={(value: string) =>
                      setSelectedLicense(value as "basic" | "premium" | "unlimited")
                    }
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

              {/* Add to Cart */}
              <div className="space-y-4">
                {isFree ? (
                  // Free product - Single download button
                  <div className="flex space-x-4">
                    <Button onClick={handleAddToCart} className="flex-1 btn-primary text-lg py-4">
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Free Download
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

          {/* Advanced Beat Features */}
          {!isFree && (
            <div className="mt-12 space-y-8">
              {/* Beat Stems Delivery - Only for unlimited license */}
              {selectedLicense === "unlimited" && (
                <BeatStemsDelivery
                  beatId={product?.id.toString() || ""}
                  beatTitle={product?.name || ""}
                  licenseType="unlimited"
                  stems={[
                    {
                      id: "1",
                      name: "Master Mix",
                      type: "master",
                      size: "8.5MB",
                      downloadUrl: "/downloads/master.wav",
                      isReady: true,
                    },
                    {
                      id: "2",
                      name: "Drums",
                      type: "drums",
                      size: "3.2MB",
                      downloadUrl: "/downloads/drums.wav",
                      isReady: true,
                    },
                    {
                      id: "3",
                      name: "Bass",
                      type: "bass",
                      size: "2.8MB",
                      downloadUrl: "/downloads/bass.wav",
                      isReady: true,
                    },
                    {
                      id: "4",
                      name: "Melody",
                      type: "melody",
                      size: "4.1MB",
                      downloadUrl: "/downloads/melody.wav",
                      isReady: true,
                    },
                    {
                      id: "5",
                      name: "Vocals",
                      type: "vocals",
                      size: "3.7MB",
                      downloadUrl: "/downloads/vocals.wav",
                      isReady: false,
                    },
                    {
                      id: "6",
                      name: "FX",
                      type: "fx",
                      size: "1.9MB",
                      downloadUrl: "/downloads/fx.wav",
                      isReady: true,
                    },
                  ]}
                  onDownload={stemId => {
                    console.log("Downloading stem:", stemId);
                    toast({
                      title: "Download Started",
                      description: "Your stem file download has begun.",
                    });
                  }}
                  onDownloadAll={() => {
                    console.log("Downloading all stems");
                    toast({
                      title: "Download Started",
                      description: "All stem files are being downloaded.",
                    });
                  }}
                />
              )}

              {/* Beat Similarity Recommendations */}
              <BeatSimilarityRecommendations
                currentBeat={{
                  id: Number(product?.id) || 1,
                  title: product?.name || "",
                  price: 99.99,
                  image: product?.images?.[0]?.src || "/api/placeholder/400/400",
                  bpm: product?.bpm || 120,
                  genre: product?.categories?.[0]?.name || "Unknown",
                  mood: "Dark",
                  key: "Am",
                  tags: ["dark", "heavy", "trap"],
                }}
                recommendations={[
                  {
                    id: 2,
                    title: "Midnight Vibes",
                    price: 89.99,
                    image: "/api/placeholder/400/400",
                    bpm: 135,
                    genre: product?.categories?.[0]?.name || "Trap",
                    mood: "Dark",
                    key: "Dm",
                    tags: ["dark", "moody"],
                  },
                  {
                    id: 3,
                    title: "Shadow Work",
                    price: 79.99,
                    image: "/api/placeholder/400/400",
                    bpm: 142,
                    genre: product?.categories?.[0]?.name || "Trap",
                    mood: "Aggressive",
                    key: "Am",
                    tags: ["heavy", "intense"],
                  },
                  {
                    id: 4,
                    title: "Urban Legend",
                    price: 119.99,
                    image: "/api/placeholder/400/400",
                    bpm: 138,
                    genre: "Hip Hop",
                    mood: "Dark",
                    key: "Fm",
                    tags: ["street", "raw"],
                  },
                ]}
                onBeatSelect={beat => {
                  console.log("Beat selected:", beat);
                  // Navigate to the selected beat
                  window.location.href = `/product/${beat.id}`;
                }}
                isLoading={false}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

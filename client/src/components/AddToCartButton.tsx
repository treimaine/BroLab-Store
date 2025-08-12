import { useCartContext } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { trackAddToCart } from "@/utils/tracking";
import { getLicensePrice } from "@/lib/cart";
import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";

type ProductLike = {
  beatId: number;
  title: string;
  genre: string;
  imageUrl?: string;
  price?: number;
};

interface AddToCartButtonProps {
  product: ProductLike;
  licenseType?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function AddToCartButton({
  product,
  licenseType = "basic",
  className = "",
  variant = "default",
  size = "md",
  showText = true,
}: AddToCartButtonProps) {
  const { addItem: addToCart } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async () => {
    if (!product || isAdding) return;

    setIsAdding(true);
    try {
      const selectedLicense = licenseType as 'basic' | 'premium' | 'unlimited';
      const price = getLicensePrice(selectedLicense);
      
      await addToCart({
        beatId: product.beatId,
        title: product.title,
        licenseType: selectedLicense,
        quantity: 1,
        imageUrl: product.imageUrl,
        genre: product.genre,
        isFree: price === 0
      });
      
      // Track the add to cart event
      trackAddToCart(
        product.beatId.toString(),
        product.title,
        price,
        selectedLicense
      );
      
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const buttonText = () => {
    if (isAdding) return "Adding...";
    if (justAdded) return "Added!";
    return "Add to Cart";
  };

  const buttonIcon = () => {
    if (isAdding) {
      return (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      );
    }
    if (justAdded) {
      return <Check className="w-4 h-4" />;
    }
    return <ShoppingCart className="w-4 h-4" />;
  };

  const mappedSize = size === "md" ? "default" : size;
  return (
    <Button
      onClick={handleAddToCart}
      disabled={isAdding}
      variant={variant}
      size={mappedSize}
      className={`
        ${justAdded ? "bg-green-600 hover:bg-green-700 text-white" : ""}
        ${className}
      `}
    >
      {buttonIcon()}
      {showText && <span className="ml-2">{buttonText()}</span>}
    </Button>
  );
}

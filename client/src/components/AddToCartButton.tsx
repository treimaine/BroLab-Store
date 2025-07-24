import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { trackAddToCart } from "@/utils/tracking";
import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";

type ProductLike = {
  id: number | string;
  title: string;
  price: number;
  image?: string;
};
interface AddToCartButtonProps {
  product: ProductLike & { name?: string };
  licenseType?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function AddToCartButton({
  product,
  licenseType = "basic",
  className = "",
  variant = "default",
  size = "md",
}: AddToCartButtonProps) {
  const { addItem: addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isAdding || justAdded) return;

    setIsAdding(true);

    try {
      // Add to cart
      addToCart({
        beatId: Number(product.id),
        title: product.title ?? product.name,
        licenseType: licenseType as any,
        quantity: 1,
        imageUrl: product.image,
        genre: (product as any).genre ?? "Unknown",
      });

      // Track the event
      trackAddToCart(
        String(product.id),
        product.title ?? product.name,
        product.price,
        licenseType
      );

      // Show success state
      setJustAdded(true);
      setTimeout(() => {
        setJustAdded(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
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
      <span className="ml-2">{buttonText()}</span>
    </Button>
  );
}

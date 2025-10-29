import { useCartContext } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LicensePricing, LicenseTypeEnum } from "@shared/schema";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function Cart() {
  const { cart, updateQuantity, removeItem, updateLicense, refreshCartPricing, clearCart } =
    useCartContext();

  if (cart.items.length === 0) {
    return (
      <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="card-dark p-12">
              <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-4">Your Cart is Empty</h1>
              <p className="text-gray-300 mb-8">
                Looks like you haven't added any beats to your cart yet.
              </p>
              <Link href="/shop">
                <Button className="btn-primary">Browse Beats</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item, index) => (
              <div key={`${item.beatId}-${item.licenseType}-${index}`} className="card-dark p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 text-white">🎵</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-gray-300 mb-2">{item.genre}</p>

                    {/* License Selector */}
                    <div className="flex items-center space-x-4">
                      <Select
                        value={item.licenseType}
                        onValueChange={value =>
                          updateLicense(item.beatId, item.licenseType, value as LicenseTypeEnum)
                        }
                      >
                        <SelectTrigger className="w-48 form-input text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">
                            Basic License - ${LicensePricing.basic}
                          </SelectItem>
                          <SelectItem value="premium">
                            Premium License - ${LicensePricing.premium}
                          </SelectItem>
                          <SelectItem value="unlimited">
                            Unlimited License - ${LicensePricing.unlimited}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <p className="text-[var(--accent-green)] font-bold text-lg">
                        ${(item.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateQuantity(item.beatId, item.licenseType, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 p-0 border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-white font-medium px-3 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateQuantity(item.beatId, item.licenseType, item.quantity + 1)
                        }
                        className="w-8 h-8 p-0 border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.beatId, item.licenseType)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="card-dark p-6 h-fit">
            <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>

              <hr className="border-gray-600" />

              <div className="flex justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <Input type="text" placeholder="Coupon Code" className="form-input" />

              <div className="space-y-4 ml-[0px] mr-[0px] mt-[60px] mb-[60px] pl-[0px] pr-[0px] pt-[0px] pb-[0px]">
                <Link href="/checkout">
                  <Button className="w-full btn-primary text-lg py-4 mt-[8px] mb-[8px] pl-[12px] pr-[12px] pt-[0px] pb-[0px]">
                    Proceed to Checkout
                  </Button>
                </Link>

                <Link href="/shop">
                  <Button className="w-full btn-secondary mt-[8px] mb-[8px] pl-[12px] pr-[12px] pt-[0px] pb-[0px]">
                    Continue Shopping
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="w-full text-gray-400 border-gray-600 hover:bg-gray-700 mt-[8px] mb-[8px] pl-[12px] pr-[12px] pt-[0px] pb-[0px]"
                >
                  Clear Cart
                </Button>
              </div>
            </div>

            {(cart as any).subtotal >= 100 && (
              <div className="mt-4 p-3 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 rounded-lg">
                <p className="text-[var(--accent-green)] text-sm font-medium">
                  🎉 You've qualified for 20% off your order!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

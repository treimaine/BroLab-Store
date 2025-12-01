import { Button } from "@/components/ui/button";
import type { OrderDetails } from "@/types/cart";
import { CheckCircle, Download, Home, Mail, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CartItem } from "../stores";

export default function OrderConfirmation() {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  useEffect(() => {
    // Parse order details from URL parameters
    const urlParams = new URLSearchParams(globalThis.location.search);
    const paymentIntentId = urlParams.get("payment_intent");
    const paymentIntentClientSecret = urlParams.get("payment_intent_client_secret");
    const cartData = urlParams.get("cart");

    if (paymentIntentId && paymentIntentClientSecret) {
      let cartItems = [];
      let total = 0;

      // Try to get cart data from URL or fallback to localStorage
      if (cartData) {
        try {
          cartItems = JSON.parse(decodeURIComponent(cartData));
          total = cartItems.reduce(
            (sum: number, item: CartItem) => sum + item.price * item.quantity,
            0
          );
        } catch (e) {
          console.error("Failed to parse cart data from URL:", e);
        }
      }

      // If no cart data, try localStorage as fallback
      if (cartItems.length === 0) {
        try {
          const stored = localStorage.getItem("brolab_cart");
          if (stored) {
            cartItems = JSON.parse(stored);
            total = cartItems.reduce(
              (sum: number, item: CartItem) => sum + item.price * item.quantity,
              0
            );
          }
        } catch (e) {
          console.error("Failed to get cart from localStorage:", e);
        }
      }

      setOrderDetails({
        id: paymentIntentId,
        status: "completed",
        total: total,
        items: cartItems.map((item: CartItem) => ({
          title: item.name,
          license: item.licenseName,
          price: item.price,
          beatId: item.productId,
        })),
        customerEmail: "customer@example.com",
      });
    }
  }, []);

  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Order Confirmed!</h1>
          <p className="text-xl text-gray-300 mb-2">Thank you for your purchase</p>
          <p className="text-gray-400">
            Your order has been successfully processed and your beats are ready for download.
          </p>
        </div>

        {orderDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Details */}
            <div className="card-dark p-6">
              <h3 className="text-xl font-bold text-white mb-6">Order Details</h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-300">Order ID:</span>
                  <span className="text-white font-mono">{orderDetails.id.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className="text-green-400 font-medium capitalize">
                    {orderDetails.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total:</span>
                  <span className="text-white font-bold">${orderDetails.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Date:</span>
                  <span className="text-white">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-4">
                <h4 className="text-lg font-semibold text-white mb-4">Items Purchased</h4>
                <div className="space-y-3">
                  {orderDetails.items.map((item: OrderDetails["items"][number]) => (
                    <div
                      key={`item-${item.beatId}-${item.license}`}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <p className="text-white font-medium">{item.title}</p>
                        <p className="text-gray-400 text-sm">{item.license} License</p>
                      </div>
                      <p className="text-white font-bold">${item.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Download Section */}
            <div className="card-dark p-6">
              <h3 className="text-xl font-bold text-white mb-6">Download Your Beats</h3>

              <div className="space-y-4 mb-6">
                {orderDetails.items.map((item: OrderDetails["items"][number]) => (
                  <div
                    key={`download-${item.beatId}-${item.license}`}
                    className="flex items-center justify-between p-4 bg-[var(--medium-gray)] rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[var(--accent-purple)] rounded-lg flex items-center justify-center">
                        <Download className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{item.title}</p>
                        <p className="text-gray-400 text-sm">{item.license} License</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="btn-primary"
                      onClick={async () => {
                        try {
                          // Call API to log the download
                          const response = await fetch("/api/downloads", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              productId: item.beatId,
                              license: item.license.toLowerCase(),
                              price: item.price || 0,
                              productName: item.title,
                            }),
                          });

                          if (response.ok) {
                            console.log("Download logged successfully");
                            // Trigger download success event for dashboard refresh
                            globalThis.dispatchEvent(new CustomEvent("download-success"));
                          }

                          // Download the file
                          const downloadUrl = `/api/download/${item.license.toLowerCase()}/${item.title
                            .replaceAll(/\s+/g, "-")
                            .toLowerCase()}`;
                          globalThis.open(downloadUrl, "_blank");
                        } catch (error) {
                          console.error("Download tracking error:", error);
                          // Download file even if tracking fails
                          const downloadUrl = `/api/download/${item.license.toLowerCase()}/${item.title
                            .replaceAll(/\s+/g, "-")
                            .toLowerCase()}`;
                          globalThis.open(downloadUrl, "_blank");
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-medium">Download Links Sent</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Download links have been sent to your email address. Links are valid for 30 days
                  from purchase date.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold text-white mb-6">What&apos;s Next?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-dark p-6">
              <Download className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">Download Your Beats</h4>
              <p className="text-gray-300 text-sm">
                Access your purchased beats immediately and start creating your masterpiece.
              </p>
            </div>

            <div className="card-dark p-6">
              <ShoppingBag className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">Browse More Beats</h4>
              <p className="text-gray-300 text-sm">
                Discover more high-quality beats from our extensive catalog.
              </p>
              <Link href="/shop">
                <Button className="btn-primary mt-4">Browse Beats</Button>
              </Link>
            </div>

            <div className="card-dark p-6">
              <Mail className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">Join Our Community</h4>
              <p className="text-gray-300 text-sm">
                Get exclusive updates, new releases, and special offers.
              </p>
              <Link href="/membership">
                <Button className="btn-primary mt-4">Learn More</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Return Home */}
        <div className="mt-12 text-center">
          <Link href="/">
            <Button className="btn-primary flex items-center space-x-2">
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

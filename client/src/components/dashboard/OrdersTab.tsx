import { formatCurrency } from "@/utils/currency";
import type { Order } from "@shared/types/dashboard";
import { Package } from "lucide-react";
import { memo, useCallback, useMemo } from "react";

interface OrdersData {
  items?: Order[];
  hasMore?: boolean;
}

/**
 * Orders Tab - Order Management and Customer Service
 *
 * Business Value:
 * - Improves customer service efficiency through order history
 * - Provides transparency in order processing and status
 * - Supports dispute resolution and refund processes
 * - Tracks individual customer transaction value
 *
 * @see docs/dashboard-component-business-value.md for detailed analysis
 */
interface OrdersTabProps {
  ordersData?: OrdersData;
  ordersLoading?: boolean;
  ordersError?: Error | null;
  onOrderClick?: (orderId: string) => void;
  onLoadMore?: () => void;
}

const OrdersTab = memo<OrdersTabProps>(
  ({
    ordersData = { items: [] },
    ordersLoading = false,
    ordersError = null,
    onOrderClick = () => {},
    onLoadMore,
  }) => {
    // Use real order data or empty array
    const displayOrders = useMemo(() => ordersData?.items || [], [ordersData?.items]);

    const handleOrderClick = useCallback(
      (order: Order) => {
        if (order.invoiceUrl) {
          window.open(order.invoiceUrl, "_blank", "noopener");
        } else {
          onOrderClick(order.id);
        }
      },
      [onOrderClick]
    );

    const getStatusColor = useCallback((status: string): string => {
      switch (status) {
        case "completed":
          return "bg-green-500";
        case "processing":
          return "bg-yellow-500";
        case "cancelled":
          return "bg-red-500";
        default:
          return "bg-gray-500";
      }
    }, []);

    const getStatusLabel = useCallback((status: string): string => {
      switch (status) {
        case "completed":
          return "Completed";
        case "processing":
          return "Processing";
        case "cancelled":
          return "Cancelled";
        default:
          return status;
      }
    }, []);

    if (ordersLoading && displayOrders.length === 0) {
      return (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-white flex items-center text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[var(--accent-purple)]" />
              Your Orders
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 3 }, (_, i) => `loading-${i}`).map(key => (
                <div key={key} className="animate-pulse">
                  <div className="h-16 sm:h-20 bg-[var(--dark-gray)] rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (ordersError) {
      return (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-white flex items-center text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[var(--accent-purple)]" />
              Your Orders
            </h2>
            <p className="text-red-400 text-sm sm:text-base">
              Failed to load orders. Please try again.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-white flex items-center text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[var(--accent-purple)]" />
            Your Orders
          </h2>
          {displayOrders && displayOrders.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {displayOrders.map((order: Order) => (
                <button
                  key={order.id}
                  type="button"
                  className="w-full p-3 sm:p-4 bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 rounded-lg hover:bg-gray-900/30 transition-colors cursor-pointer text-left"
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm sm:text-base truncate">
                        {order.items?.[0]?.title || `Order #${order.id}`}
                      </p>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-white font-bold text-sm sm:text-base">
                        {Number(order.total || 0) <= 0 ? "FREE" : formatCurrency(order.total)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${getStatusColor(order.status)}`}
                        />
                        <p className="text-gray-400 text-xs sm:text-sm capitalize">
                          {getStatusLabel(order.status)}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {ordersData?.hasMore && (
                <div className="pt-2">
                  <button
                    className="text-xs sm:text-sm px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                    onClick={onLoadMore}
                    disabled={ordersLoading}
                  >
                    {ordersLoading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-400 text-sm sm:text-base mb-2">No orders found</p>
              <p className="text-gray-500 text-xs sm:text-sm">
                {ordersLoading ? "Loading orders..." : "Your orders will appear here"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

OrdersTab.displayName = "OrdersTab";

export default OrdersTab;

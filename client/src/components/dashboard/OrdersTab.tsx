import { OrderList } from "@/components/orders/OrderList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

interface OrdersTabProps {
  ordersData: any;
  ordersLoading: boolean;
  ordersError: any;
  onOrderClick: (orderId: number) => void;
}

export default function OrdersTab({
  ordersData,
  ordersLoading,
  ordersError,
  onOrderClick,
}: OrdersTabProps) {
  if (ordersLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Package className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
              Your Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-[var(--dark-gray)] rounded-lg"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="space-y-6">
        <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Package className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
              Your Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-400">Failed to load orders. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Package className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
            Your Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OrderList onOrderClick={onOrderClick} />
        </CardContent>
      </Card>
    </div>
  );
}

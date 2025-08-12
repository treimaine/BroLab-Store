import { Package } from "lucide-react";

interface OrdersTabProps {
  ordersData?: any;
  ordersLoading?: boolean;
  ordersError?: any;
  onOrderClick?: (orderId: number) => void;
}

export default function OrdersTab({
  ordersData = { orders: [] },
  ordersLoading = false,
  ordersError = null,
  onOrderClick = () => {},
}: OrdersTabProps) {
  // Données par défaut si aucune commande n'est fournie
  const defaultOrders = [
    {
      id: 1,
      items: [{ name: "Tropical Vibes" }],
      created_at: new Date().toISOString(),
      total: 999,
      status: "completed",
    },
    {
      id: 2,
      items: [{ name: "Midnight Groove" }],
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      total: 1299,
      status: "processing",
    },
  ];

  const displayOrders = ordersData?.orders?.length > 0 ? ordersData.orders : defaultOrders;

  if (ordersLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-white flex items-center text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[var(--accent-purple)]" />
            Vos Commandes
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 sm:h-20 bg-[var(--dark-gray)] rounded-lg"></div>
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
            Vos Commandes
          </h2>
          <p className="text-red-400 text-sm sm:text-base">
            Échec du chargement des commandes. Veuillez réessayer.
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
          Vos Commandes
        </h2>
        {displayOrders.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {displayOrders.map((order: any) => (
              <div
                key={order.id}
                className="p-3 sm:p-4 bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 rounded-lg hover:bg-gray-900/30 transition-colors cursor-pointer"
                onClick={() => onOrderClick(order.id)}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm sm:text-base truncate">
                      {order.items?.[0]?.name || `Commande #${order.id}`}
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      {new Date(order.created_at).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-white font-bold text-sm sm:text-base">
                      ${(order.total / 100).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          order.status === "completed"
                            ? "bg-green-500"
                            : order.status === "processing"
                              ? "bg-yellow-500"
                              : order.status === "cancelled"
                                ? "bg-red-500"
                                : "bg-gray-500"
                        }`}
                      ></span>
                      <p className="text-gray-400 text-xs sm:text-sm capitalize">
                        {order.status === "completed"
                          ? "Terminée"
                          : order.status === "processing"
                            ? "En cours"
                            : order.status === "cancelled"
                              ? "Annulée"
                              : order.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-400 text-sm sm:text-base mb-2">Aucune commande trouvée</p>
            <p className="text-gray-500 text-xs sm:text-sm">Vos commandes apparaîtront ici</p>
          </div>
        )}
      </div>
    </div>
  );
}

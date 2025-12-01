import { Button } from "@/components/ui/button";
import { useOrders } from "@/hooks/useOrders";
import type { Order } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { OrderCard } from "./OrderCard";

interface OrderListProps {
  readonly page?: number;
  readonly limit?: number;
  readonly onPageChange?: (page: number) => void;
  readonly onOrderClick?: (orderId: number) => void;
}

export function OrderList({
  page = 1,
  onPageChange,
  onOrderClick,
}: Readonly<OrderListProps>): JSX.Element {
  const { orders, isLoading } = useOrders();

  // Orders is already an array from useOrders hook
  const data = { orders, totalPages: 1 } as const;
  const error = null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">
          Une erreur est survenue lors du chargement des commandes
        </p>
        <Button
          variant="outline"
          className="mt-4 border-gray-600 text-gray-300 hover:text-white"
          onClick={() => globalThis.location.reload()}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  if (!data?.orders?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Aucune commande trouvée</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {data.orders.map(order => {
          const convexOrder = order as unknown as {
            _id: string;
            _creationTime: number;
            id?: number;
            email: string;
            items: Order["items"];
            status: string;
            total: number;
            invoice_number?: string;
            invoice_pdf_url?: string;
          };
          const orderId = convexOrder.id ?? Number.parseInt(convexOrder._id, 10);

          return (
            <OrderCard
              key={convexOrder._id}
              order={{
                id: orderId,
                created_at: new Date(convexOrder._creationTime).toISOString(),
                email: convexOrder.email,
                items: convexOrder.items,
                invoice_pdf_url: convexOrder.invoice_pdf_url,
                invoice_number: convexOrder.invoice_number,
                status: convexOrder.status as Order["status"],
                total: convexOrder.total,
              }}
              onOrderClick={onOrderClick}
            />
          );
        })}
      </div>

      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            className="border-gray-600 text-gray-300 hover:text-white disabled:opacity-50"
          >
            Précédent
          </Button>

          <div className="flex items-center gap-2 px-4 text-sm text-gray-400">
            Page {page} sur {data.totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => onPageChange?.(page + 1)}
            className="border-gray-600 text-gray-300 hover:text-white disabled:opacity-50"
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}

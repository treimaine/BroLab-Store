import { useQuery } from '@tanstack/react-query';
import type { Order } from '@shared/schema';

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

interface OrderResponse {
  order: Order;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

interface InvoiceResponse {
  url: string;
}

/**
 * Hook pour récupérer la liste paginée des commandes
 */
export function useOrders(page = 1, limit = 10) {
  return useQuery<OrdersResponse>({
    queryKey: ['orders', page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/orders/me?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    }
  });
}

/**
 * Hook pour récupérer les détails d'une commande spécifique
 */
export function useOrder(id: number) {
  return useQuery<OrderResponse>({
    queryKey: ['orders', id],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      return response.json();
    },
    enabled: Boolean(id)
  });
}

/**
 * Hook pour récupérer l'URL de la facture PDF
 */
export function useOrderInvoice(id: number) {
  return useQuery<InvoiceResponse>({
    queryKey: ['orders', id, 'invoice'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${id}/invoice`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      return response.json();
    },
    enabled: Boolean(id)
  });
}

/**
 * Hook pour télécharger une facture
 */
export function useDownloadInvoice(id: number) {
  return async () => {
    try {
      const response = await fetch(`/api/orders/${id}/invoice/download`);
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  };
}
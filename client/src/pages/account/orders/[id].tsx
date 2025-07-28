import { useLocation, useParams } from 'wouter';
import type { Order, CartItem } from '@shared/schema';
import { useOrder, useOrderInvoice, useDownloadInvoice } from '@/hooks/useOrders';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isLoading: isLoadingUser } = useCurrentUser();
  const { data: orderData, isLoading, error } = useOrder(Number(id));
  const { data: invoiceData } = useOrderInvoice(Number(id));
  const downloadInvoice = useDownloadInvoice(Number(id));

  if (isLoadingUser) {
    return null; // La redirection sera gérée par le layout si l'utilisateur n'est pas connecté
  }

  const handleDownload = async () => {
    try {
      await downloadInvoice();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger la facture',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'pending':
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'cancelled':
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !orderData?.order) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Une erreur est survenue lors du chargement de la commande</p>
        <Button 
          variant="outline" 
          className="mt-4 border-gray-600 text-gray-300 hover:text-white"
          onClick={() => window.location.reload()}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  const { order, items } = orderData;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/account/orders')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-100">
            Commande #{order.invoice_number || order.id}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {formatDate(order.created_at)}
          </p>
        </div>

        {invoiceData?.url && (
          <Button
            variant="outline"
            onClick={handleDownload}
            className="border-gray-600 text-gray-300 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger la facture
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex justify-between items-center">
              <span>Statut de la commande</span>
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <h3 className="font-medium text-gray-300 mb-1">Email</h3>
              <p className="text-gray-400">{order.email}</p>
            </div>
            {order.shipping_address && (
              <div>
                <h3 className="font-medium text-gray-300 mb-1">Adresse de livraison</h3>
                <p className="text-gray-400 whitespace-pre-line">{order.shipping_address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle>Détails de la commande</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-700">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className="py-4 first:pt-0 last:pb-0 flex justify-between items-center"
                >
                  <div>
                    <p className="text-gray-200">{item.name}</p>
                    <p className="text-sm text-gray-400">
                      Quantité: {item.quantity} × {item.price.toFixed(2)} €
                    </p>
                  </div>
                  <p className="text-gray-200 font-medium">
                    {item.total.toFixed(2)} €
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-200">Total</span>
                <span className="text-gray-100">{order.total.toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
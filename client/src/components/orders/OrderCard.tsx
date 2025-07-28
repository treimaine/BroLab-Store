import { Download, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDownloadInvoice } from '@/hooks/useOrders';
import type { Order } from '@shared/schema';

interface OrderCardProps {
  order: Order;
  showDetails?: boolean;
}

export function OrderCard({ order, showDetails = true }: OrderCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const downloadInvoice = useDownloadInvoice(order.id);

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

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center text-lg">
          <span className="text-gray-100">
            Commande #{order.invoice_number || order.id}
          </span>
          <Badge className={getStatusColor(order.status)}>
            {order.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">
              {formatDate(order.created_at)}
            </p>
            <p className="text-gray-300">{order.email}</p>
            {Array.isArray(order.items) && (
              <p className="text-sm text-gray-400">
                {order.items.length} article{order.items.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="text-right space-y-2">
            <p className="text-xl font-bold text-gray-100">
              {order.total.toFixed(2)} €
            </p>
            
            <div className="flex gap-2 justify-end">
              {order.invoice_pdf_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              )}

              {showDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/account/orders/${order.id}`)}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Détails
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
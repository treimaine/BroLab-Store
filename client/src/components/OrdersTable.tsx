import React, { useCallback } from 'react';
import InteractiveDataTable, { TableColumn, TableData } from './InteractiveDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  beatTitle: string;
  artist?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'processing';
  createdAt: string;
  updatedAt?: string;
  paymentMethod?: string;
  licenseType?: string;
  downloadUrl?: string;
}

interface OrdersTableProps {
  orders: Order[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  isLoading = false,
  onRefresh,
  className,
}) => {
  // Configuration des colonnes
  const columns: TableColumn[] = [
    {
      key: 'id',
      label: 'ID Commande',
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <span className="font-mono text-sm text-muted-foreground">#{value.slice(-8)}</span>
      ),
    },
    {
      key: 'beatTitle',
      label: 'Beat',
      sortable: true,
      filterable: true,
      render: (value: string, row: Order) => (
        <div className="space-y-1">
          <p className="font-medium">{value}</p>
          {row.artist && (
            <p className="text-sm text-muted-foreground">par {row.artist}</p>
          )}
        </div>
      ),
    },
    {
      key: 'licenseType',
      label: 'Licence',
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value || 'Standard'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      label: 'Montant',
      type: 'currency',
      sortable: true,
      render: (value: number) => (
        <span className="font-semibold text-green-600">
          ${value.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      filterable: true,
      render: (value: string) => {
        const statusConfig = {
          pending: {
            variant: 'secondary' as const,
            icon: Clock,
            label: 'En attente',
            className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          },
          processing: {
            variant: 'secondary' as const,
            icon: RefreshCw,
            label: 'En cours',
            className: 'bg-blue-100 text-blue-800 border-blue-200',
          },
          completed: {
            variant: 'default' as const,
            icon: CheckCircle,
            label: 'Terminé',
            className: 'bg-green-100 text-green-800 border-green-200',
          },
          failed: {
            variant: 'destructive' as const,
            icon: XCircle,
            label: 'Échoué',
            className: 'bg-red-100 text-red-800 border-red-200',
          },
        };

        const config = statusConfig[value as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;

        return (
          <Badge className={config.className}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'paymentMethod',
      label: 'Paiement',
      filterable: true,
      render: (value: string) => (
        <span className="text-sm capitalize">
          {value || 'Carte bancaire'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      type: 'date',
      sortable: true,
      render: (value: string) => (
        <div className="space-y-1">
          <p className="text-sm">
            {new Date(value).toLocaleDateString('fr-FR')}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(value).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
  ];

  // Gestion des actions sur les lignes
  const handleRowClick = useCallback((row: TableData) => {
    const order = row as Order;
    toast.info(`Commande #${order.id.slice(-8)} sélectionnée`);
    // Ici, on pourrait ouvrir un modal avec les détails de la commande
  }, []);

  // Export des données
  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      // Générer un CSV
      const csvHeaders = columns.map(col => col.label).join(',');
      const csvData = orders.map(order => [
        order.id,
        order.beatTitle,
        order.licenseType || 'Standard',
        order.amount,
        order.status,
        order.paymentMethod || 'Carte bancaire',
        new Date(order.createdAt).toLocaleDateString('fr-FR'),
      ].join(',')).join('\n');
      
      const csvContent = `${csvHeaders}\n${csvData}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `commandes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Export CSV téléchargé');
    } else {
      // Pour le PDF, on pourrait utiliser une bibliothèque comme jsPDF
      toast.info('Export PDF en cours de développement');
    }
  }, [orders, columns]);

  // Données formatées pour le tableau
  const tableData: TableData[] = orders.map(order => ({
    id: order.id,
    beatTitle: order.beatTitle,
    artist: order.artist,
    licenseType: order.licenseType,
    amount: order.amount,
    status: order.status,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    downloadUrl: order.downloadUrl,
  }));

  return (
    <div className={className}>
      <InteractiveDataTable
        title="Commandes"
        description="Gérez et suivez toutes vos commandes de beats"
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par beat, ID ou statut..."
        onRowClick={handleRowClick}
        onExport={handleExport}
      />
      
      {/* Actions rapides */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const pendingOrders = orders.filter(o => o.status === 'pending');
            if (pendingOrders.length > 0) {
              toast.info(`${pendingOrders.length} commande(s) en attente`);
            } else {
              toast.success('Aucune commande en attente');
            }
          }}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Vérifier les commandes en attente
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const completedOrders = orders.filter(o => o.status === 'completed' && o.downloadUrl);
            toast.info(`${completedOrders.length} téléchargement(s) disponible(s)`);
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Téléchargements disponibles
        </Button>
      </div>
    </div>
  );
};

export default OrdersTable;
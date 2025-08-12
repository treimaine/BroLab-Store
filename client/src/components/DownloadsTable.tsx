import React, { useCallback } from 'react';
import InteractiveDataTable, { TableColumn, TableData } from './InteractiveDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Download,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  FileAudio,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface DownloadItem {
  id: string;
  beatTitle: string;
  artist?: string;
  fileSize: number; // en MB
  format: 'mp3' | 'wav' | 'flac';
  quality: string; // ex: "320kbps", "24bit/96kHz"
  downloadedAt: string;
  downloadCount: number;
  maxDownloads?: number;
  licenseType?: string;
  downloadUrl: string;
  isExpired?: boolean;
  expiresAt?: string;
}

interface DownloadsTableProps {
  downloads: DownloadItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const DownloadsTable: React.FC<DownloadsTableProps> = ({
  downloads,
  isLoading = false,
  onRefresh,
  className,
}) => {
  // Configuration des colonnes
  const columns: TableColumn[] = [
    {
      key: 'beatTitle',
      label: 'Beat',
      sortable: true,
      filterable: true,
      render: (value: string, row: DownloadItem) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileAudio className="w-4 h-4 text-blue-500" />
            <p className="font-medium">{value}</p>
          </div>
          {row.artist && (
            <p className="text-sm text-muted-foreground">par {row.artist}</p>
          )}
        </div>
      ),
    },
    {
      key: 'format',
      label: 'Format',
      sortable: true,
      filterable: true,
      render: (value: string, row: DownloadItem) => (
        <div className="space-y-1">
          <Badge variant="outline" className="uppercase font-mono">
            {value}
          </Badge>
          <p className="text-xs text-muted-foreground">{row.quality}</p>
        </div>
      ),
    },
    {
      key: 'fileSize',
      label: 'Taille',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm font-mono">
          {value < 1 ? `${(value * 1024).toFixed(0)} KB` : `${value.toFixed(1)} MB`}
        </span>
      ),
    },
    {
      key: 'licenseType',
      label: 'Licence',
      filterable: true,
      render: (value: string) => (
        <Badge variant="secondary" className="capitalize">
          {value || 'Standard'}
        </Badge>
      ),
    },
    {
      key: 'downloadCount',
      label: 'Téléchargements',
      sortable: true,
      render: (value: number, row: DownloadItem) => {
        const isLimited = row.maxDownloads && row.maxDownloads > 0;
        const isNearLimit = isLimited && value >= (row.maxDownloads! * 0.8);
        const isAtLimit = isLimited && value >= row.maxDownloads!;
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className={`font-medium ${
                isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-green-600'
              }`}>
                {value}
              </span>
              {isLimited && (
                <span className="text-muted-foreground">/ {row.maxDownloads}</span>
              )}
            </div>
            {isLimited && (
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${
                    isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((value / row.maxDownloads!) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'downloadedAt',
      label: 'Premier téléchargement',
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
    {
      key: 'status',
      label: 'Statut',
      render: (_, row: DownloadItem) => {
        const isExpired = row.isExpired || (row.expiresAt && new Date(row.expiresAt) < new Date());
        const isAtLimit = row.maxDownloads && row.downloadCount >= row.maxDownloads;
        
        if (isExpired) {
          return (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Expiré
            </Badge>
          );
        }
        
        if (isAtLimit) {
          return (
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              Limite atteinte
            </Badge>
          );
        }
        
        return (
          <Badge variant="default">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disponible
          </Badge>
        );
      },
    },
  ];

  // Gestion du téléchargement
  const handleDownload = useCallback((download: DownloadItem) => {
    const isExpired = download.isExpired || (download.expiresAt && new Date(download.expiresAt) < new Date());
    const isAtLimit = download.maxDownloads && download.downloadCount >= download.maxDownloads;
    
    if (isExpired) {
      toast.error('Ce téléchargement a expiré');
      return;
    }
    
    if (isAtLimit) {
      toast.error('Limite de téléchargements atteinte');
      return;
    }
    
    // Simuler le téléchargement
    const link = document.createElement('a');
    link.href = download.downloadUrl;
    link.download = `${download.beatTitle}.${download.format}`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Téléchargement de "${download.beatTitle}" démarré`);
  }, []);

  // Gestion des actions sur les lignes
  const handleRowClick = useCallback((row: TableData) => {
    const download = row as DownloadItem;
    handleDownload(download);
  }, [handleDownload]);

  // Export des données
  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const csvHeaders = columns.map(col => col.label).join(',');
      const csvData = downloads.map(download => [
        download.beatTitle,
        download.format,
        download.fileSize,
        download.licenseType || 'Standard',
        download.downloadCount,
        download.maxDownloads || 'Illimité',
        new Date(download.downloadedAt).toLocaleDateString('fr-FR'),
      ].join(',')).join('\n');
      
      const csvContent = `${csvHeaders}\n${csvData}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `telechargements_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Export CSV téléchargé');
    } else {
      toast.info('Export PDF en cours de développement');
    }
  }, [downloads, columns]);

  // Données formatées pour le tableau
  const tableData: TableData[] = downloads.map(download => ({
    id: download.id,
    beatTitle: download.beatTitle,
    artist: download.artist,
    fileSize: download.fileSize,
    format: download.format,
    quality: download.quality,
    downloadedAt: download.downloadedAt,
    downloadCount: download.downloadCount,
    maxDownloads: download.maxDownloads,
    licenseType: download.licenseType,
    downloadUrl: download.downloadUrl,
    isExpired: download.isExpired,
    expiresAt: download.expiresAt,
  }));

  // Statistiques rapides
  const stats = {
    total: downloads.length,
    available: downloads.filter(d => !d.isExpired && (!d.maxDownloads || d.downloadCount < d.maxDownloads)).length,
    expired: downloads.filter(d => d.isExpired || (d.expiresAt && new Date(d.expiresAt) < new Date())).length,
    totalSize: downloads.reduce((acc, d) => acc + d.fileSize, 0),
  };

  return (
    <div className={className}>
      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              <p className="text-sm text-muted-foreground">Expirés</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalSize.toFixed(1)} MB
              </p>
              <p className="text-sm text-muted-foreground">Taille totale</p>
            </div>
          </div>
        </div>
      </div>
      
      <InteractiveDataTable
        title="Téléchargements"
        description="Accédez à tous vos beats téléchargés"
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par beat, format ou artiste..."
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
            const availableDownloads = downloads.filter(d => 
              !d.isExpired && (!d.maxDownloads || d.downloadCount < d.maxDownloads)
            );
            if (availableDownloads.length > 0) {
              toast.success(`${availableDownloads.length} téléchargement(s) disponible(s)`);
            } else {
              toast.info('Aucun téléchargement disponible');
            }
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Vérifier la disponibilité
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const expiringSoon = downloads.filter(d => {
              if (!d.expiresAt) return false;
              const expiryDate = new Date(d.expiresAt);
              const now = new Date();
              const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
              return daysDiff <= 7 && daysDiff > 0;
            });
            
            if (expiringSoon.length > 0) {
              toast.warning(`${expiringSoon.length} téléchargement(s) expire(nt) bientôt`);
            } else {
              toast.success('Aucun téléchargement n\'expire bientôt');
            }
          }}
        >
          <Clock className="w-4 h-4 mr-2" />
          Vérifier les expirations
        </Button>
      </div>
    </div>
  );
};

export default DownloadsTable;
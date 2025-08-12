import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  FileText,
  Table,
  Calendar,
  Filter,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'csv' | 'pdf' | 'excel';
  fields: string[];
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ExportHistory {
  id: string;
  templateName: string;
  type: 'csv' | 'pdf' | 'excel';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  fileSize?: number;
  downloadUrl?: string;
  recordCount?: number;
}

interface DataExportManagerProps {
  availableFields: Array<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
  }>;
  onExport: (template: ExportTemplate) => Promise<void>;
  exportHistory: ExportHistory[];
  onDeleteExport: (id: string) => void;
  onDownloadExport: (id: string) => void;
  className?: string;
}

const DEFAULT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'orders-summary',
    name: 'Résumé des commandes',
    description: 'Export des commandes avec informations essentielles',
    type: 'csv',
    fields: ['id', 'beatTitle', 'amount', 'status', 'createdAt'],
  },
  {
    id: 'downloads-report',
    name: 'Rapport de téléchargements',
    description: 'Statistiques détaillées des téléchargements',
    type: 'pdf',
    fields: ['beatTitle', 'downloadCount', 'format', 'downloadedAt'],
  },
  {
    id: 'revenue-analysis',
    name: 'Analyse des revenus',
    description: 'Rapport financier complet',
    type: 'excel',
    fields: ['date', 'amount', 'licenseType', 'paymentMethod'],
  },
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusIcon = (status: ExportHistory['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'processing':
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: ExportHistory['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'processing':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'pending':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'failed':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getTypeIcon = (type: 'csv' | 'pdf' | 'excel') => {
  switch (type) {
    case 'csv':
      return <Table className="w-4 h-4" />;
    case 'pdf':
      return <FileText className="w-4 h-4" />;
    case 'excel':
      return <Table className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

export const DataExportManager: React.FC<DataExportManagerProps> = ({
  availableFields,
  onExport,
  exportHistory,
  onDeleteExport,
  onDownloadExport,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'custom' | 'history'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [customExport, setCustomExport] = useState<Partial<ExportTemplate>>({
    name: '',
    description: '',
    type: 'csv',
    fields: [],
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleTemplateExport = useCallback(async (template: ExportTemplate) => {
    setIsExporting(true);
    try {
      await onExport(template);
      toast.success(`Export "${template.name}" lancé avec succès`);
    } catch (error) {
      toast.error('Erreur lors du lancement de l\'export');
    } finally {
      setIsExporting(false);
    }
  }, [onExport]);

  const handleCustomExport = useCallback(async () => {
    if (!customExport.name || !customExport.fields?.length) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    const template: ExportTemplate = {
      id: `custom-${Date.now()}`,
      name: customExport.name!,
      description: customExport.description || '',
      type: customExport.type!,
      fields: customExport.fields!,
    };

    setIsExporting(true);
    try {
      await onExport(template);
      toast.success('Export personnalisé lancé avec succès');
      setCustomExport({
        name: '',
        description: '',
        type: 'csv',
        fields: [],
      });
    } catch (error) {
      toast.error('Erreur lors du lancement de l\'export');
    } finally {
      setIsExporting(false);
    }
  }, [customExport, onExport]);

  const handleFieldToggle = useCallback((fieldKey: string, checked: boolean) => {
    setCustomExport(prev => ({
      ...prev,
      fields: checked
        ? [...(prev.fields || []), fieldKey]
        : (prev.fields || []).filter(f => f !== fieldKey),
    }));
  }, []);

  const sortedHistory = useMemo(() => {
    return [...exportHistory].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [exportHistory]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Gestionnaire d'exports</h2>
          <p className="text-gray-400">Exportez vos données dans différents formats</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-gray-700/50">
        {[
          { id: 'templates', label: 'Modèles', icon: <Settings className="w-4 h-4" /> },
          { id: 'custom', label: 'Personnalisé', icon: <Filter className="w-4 h-4" /> },
          { id: 'history', label: 'Historique', icon: <Clock className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Onglet Modèles */}
        {activeTab === 'templates' && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {DEFAULT_TEMPLATES.map((template) => (
              <Card key={template.id} className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:border-purple-500/50 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(template.type)}
                      <CardTitle className="text-white text-lg">{template.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="border-gray-600 text-gray-300">
                      {template.type.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-400">Champs inclus:</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.fields.slice(0, 3).map((field) => (
                          <Badge key={field} variant="secondary" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                        {template.fields.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.fields.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleTemplateExport(template)}
                      disabled={isExporting}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? 'Export en cours...' : 'Exporter'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Onglet Personnalisé */}
        {activeTab === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Export personnalisé</CardTitle>
                <CardDescription>Créez un export sur mesure avec les champs de votre choix</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="export-name" className="text-white">Nom de l'export</Label>
                      <Input
                        id="export-name"
                        value={customExport.name || ''}
                        onChange={(e) => setCustomExport(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Mon export personnalisé"
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="export-description" className="text-white">Description (optionnel)</Label>
                      <Input
                        id="export-description"
                        value={customExport.description || ''}
                        onChange={(e) => setCustomExport(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description de l'export"
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Format d'export</Label>
                      <Select
                        value={customExport.type}
                        onValueChange={(value: 'csv' | 'pdf' | 'excel') => 
                          setCustomExport(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-white">Champs à inclure</Label>
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border border-gray-600 rounded-md p-3 bg-gray-800/50">
                      {availableFields.map((field) => (
                        <div key={field.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={field.key}
                            checked={customExport.fields?.includes(field.key) || false}
                            onCheckedChange={(checked) => handleFieldToggle(field.key, checked as boolean)}
                          />
                          <Label htmlFor={field.key} className="text-sm text-gray-300 cursor-pointer">
                            {field.label}
                          </Label>
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                            {field.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Separator className="bg-gray-700" />
                <div className="flex justify-end">
                  <Button
                    onClick={handleCustomExport}
                    disabled={isExporting || !customExport.name || !customExport.fields?.length}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Export en cours...' : 'Lancer l\'export'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Onglet Historique */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Historique des exports</CardTitle>
                <CardDescription>Gérez et téléchargez vos exports précédents</CardDescription>
              </CardHeader>
              <CardContent>
                {sortedHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Aucun export dans l'historique</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedHistory.map((export_item) => (
                      <div
                        key={export_item.id}
                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(export_item.type)}
                            {getStatusIcon(export_item.status)}
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{export_item.templateName}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <span>Créé le {formatDate(export_item.createdAt)}</span>
                              {export_item.fileSize && (
                                <span>{formatFileSize(export_item.fileSize)}</span>
                              )}
                              {export_item.recordCount && (
                                <span>{export_item.recordCount} enregistrements</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(export_item.status)}>
                            {export_item.status}
                          </Badge>
                          <div className="flex space-x-1">
                            {export_item.status === 'completed' && export_item.downloadUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDownloadExport(export_item.id)}
                                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDeleteExport(export_item.id)}
                              className="border-red-600 text-red-400 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DataExportManager;
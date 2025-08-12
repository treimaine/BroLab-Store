import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  Download,
  Eye,
  ChevronUp,
  ChevronDown,
  Calendar,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  FileText,
  Printer,
} from 'lucide-react';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'number' | 'date' | 'status' | 'currency';
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableData {
  [key: string]: any;
}

interface InteractiveDataTableProps {
  title: string;
  description?: string;
  columns: TableColumn[];
  data: TableData[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: TableData) => void;
  onExport?: (format: 'csv' | 'pdf') => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

const InteractiveDataTable: React.FC<InteractiveDataTableProps> = ({
  title,
  description,
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Rechercher...',
  onRowClick,
  onExport,
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fonction de tri
  const handleSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => {
        if (prev === 'asc') return 'desc';
        if (prev === 'desc') return null;
        return 'asc';
      });
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Fonction de filtrage
  const handleFilter = useCallback((columnKey: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: value,
    }));
    setCurrentPage(1);
  }, []);

  // Données filtrées et triées
  const processedData = useMemo(() => {
    let filtered = data;

    // Recherche globale
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filtres par colonne
    Object.entries(filters).forEach(([columnKey, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(row =>
          String(row[columnKey]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    // Tri
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, filters, sortColumn, sortDirection]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  // Rendu des cellules
  const renderCell = useCallback((column: TableColumn, value: any, row: TableData) => {
    if (column.render) {
      return column.render(value, row);
    }

    switch (column.type) {
      case 'currency':
        return (
          <span className="font-medium text-green-600">
            {typeof value === 'number' ? `$${value.toFixed(2)}` : value}
          </span>
        );
      case 'date':
        return (
          <span className="text-sm text-muted-foreground">
            {value ? new Date(value).toLocaleDateString('fr-FR') : '-'}
          </span>
        );
      case 'status':
        return (
          <Badge
            variant={value === 'completed' ? 'default' : value === 'pending' ? 'secondary' : 'destructive'}
            className="capitalize"
          >
            {value === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
            {value === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {value === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
            {value}
          </Badge>
        );
      default:
        return <span>{value}</span>;
    }
  }, []);

  // Icône de tri
  const getSortIcon = useCallback((columnKey: string) => {
    if (sortColumn !== columnKey) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  }, [sortColumn, sortDirection]);

  if (isLoading) {
    return (
      <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>{title}</span>
                <Badge variant="outline">{processedData.length}</Badge>
              </CardTitle>
              {description && (
                <CardDescription>{description}</CardDescription>
              )}
            </div>
            
            {onExport && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport('csv')}
                  className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 hover:bg-gray-800/30"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport('pdf')}
                  className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 hover:bg-gray-800/30"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Barre de recherche et filtres */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900/20 backdrop-blur-sm border border-gray-700/30"
              />
            </div>
            
            <div className="flex space-x-2">
              <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-32 bg-gray-900/20 backdrop-blur-sm border border-gray-700/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 par page</SelectItem>
                  <SelectItem value="10">10 par page</SelectItem>
                  <SelectItem value="25">25 par page</SelectItem>
                  <SelectItem value="50">50 par page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtres par colonne */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {columns.filter(col => col.filterable).map(column => (
              <div key={column.key} className="space-y-2">
                <label className="text-sm font-medium">{column.label}</label>
                <Input
                  placeholder={`Filtrer par ${column.label.toLowerCase()}`}
                  value={filters[column.key] || ''}
                  onChange={(e) => handleFilter(column.key, e.target.value)}
                  className="h-8 bg-gray-900/20 backdrop-blur-sm border border-gray-700/30"
                />
              </div>
            ))}
          </div>

          {/* Tableau */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(column => (
                    <TableHead
                      key={column.key}
                      className={column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={column.sortable ? () => handleSort(column.key) : undefined}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column.label}</span>
                        {column.sortable && getSortIcon(column.key)}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <Package className="w-12 h-12 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">Aucune donnée trouvée</p>
                          {searchTerm && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSearchTerm('')}
                            >
                              Effacer la recherche
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((row, index) => (
                      <motion.tr
                        key={row.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className={`hover:bg-muted/50 transition-colors ${
                          onRowClick ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => onRowClick?.(row)}
                      >
                        {columns.map(column => (
                          <TableCell key={column.key}>
                            {renderCell(column, row[column.key], row)}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
                {Math.min(currentPage * itemsPerPage, processedData.length)} sur{' '}
                {processedData.length} résultats
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                
                <div className="flex space-x-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNumber = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (pageNumber > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </motion.div>
  );
};

export default InteractiveDataTable;
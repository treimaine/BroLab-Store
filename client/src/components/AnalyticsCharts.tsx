import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Music,
  Users,
  Calendar,
  BarChart3,
} from 'lucide-react';

interface AnalyticsData {
  revenue: Array<{ date: string; amount: number; orders: number }>;
  downloads: Array<{ date: string; count: number; unique: number }>;
  popularBeats: Array<{ name: string; downloads: number; revenue: number }>;
  licenseDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyGrowth: {
    revenue: number;
    downloads: number;
    newUsers: number;
  };
}

interface AnalyticsChartsProps {
  data: AnalyticsData;
  timeRange: '7d' | '30d' | '90d' | '1y';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
  className?: string;
}

const COLORS = {
  primary: '#8B5CF6',
  secondary: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#A855F7',
  pink: '#EC4899',
  indigo: '#6366F1',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('fr-FR').format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl backdrop-blur-sm">
        <p className="text-gray-300 text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('€') ? formatCurrency(entry.value) : formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  format?: 'currency' | 'number' | 'percentage';
}> = ({ title, value, change, icon, format = 'number' }) => {
  const isPositive = change >= 0;
  const formattedValue = useMemo(() => {
    if (format === 'currency' && typeof value === 'number') {
      return formatCurrency(value);
    }
    if (format === 'percentage' && typeof value === 'number') {
      return `${value}%`;
    }
    if (typeof value === 'number') {
      return formatNumber(value);
    }
    return value;
  }, [value, format]);

  return (
    <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              {icon}
            </div>
            <div>
              <p className="text-sm text-gray-400">{title}</p>
              <p className="text-2xl font-bold text-white">{formattedValue}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  className = '',
}) => {
  const totalRevenue = useMemo(() => {
    return data.revenue.reduce((sum, item) => sum + item.amount, 0);
  }, [data.revenue]);

  const totalDownloads = useMemo(() => {
    return data.downloads.reduce((sum, item) => sum + item.count, 0);
  }, [data.downloads]);

  const averageOrderValue = useMemo(() => {
    const totalOrders = data.revenue.reduce((sum, item) => sum + item.orders, 0);
    return totalOrders > 0 ? totalRevenue / totalOrders : 0;
  }, [totalRevenue, data.revenue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header avec sélecteur de période */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Analytics & Tendances</h2>
          <p className="text-gray-400">Analyse détaillée de vos performances</p>
        </div>
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-32 bg-gray-900/50 border-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 jours</SelectItem>
            <SelectItem value="30d">30 jours</SelectItem>
            <SelectItem value="90d">90 jours</SelectItem>
            <SelectItem value="1y">1 an</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Revenus totaux"
          value={totalRevenue}
          change={data.monthlyGrowth.revenue}
          icon={<DollarSign className="w-5 h-5 text-purple-400" />}
          format="currency"
        />
        <MetricCard
          title="Téléchargements"
          value={totalDownloads}
          change={data.monthlyGrowth.downloads}
          icon={<Download className="w-5 h-5 text-blue-400" />}
        />
        <MetricCard
          title="Panier moyen"
          value={averageOrderValue}
          change={5.2}
          icon={<BarChart3 className="w-5 h-5 text-green-400" />}
          format="currency"
        />
        <MetricCard
          title="Nouveaux utilisateurs"
          value={data.monthlyGrowth.newUsers}
          change={12.8}
          icon={<Users className="w-5 h-5 text-orange-400" />}
        />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des revenus */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span>Évolution des revenus</span>
            </CardTitle>
            <CardDescription>Revenus et commandes sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenue}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={COLORS.primary}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Téléchargements */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Download className="w-5 h-5 text-blue-400" />
              <span>Téléchargements</span>
            </CardTitle>
            <CardDescription>Évolution des téléchargements</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.downloads}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.secondary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: COLORS.secondary, strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="unique"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: COLORS.success, strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beats populaires */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Music className="w-5 h-5 text-pink-400" />
              <span>Beats populaires</span>
            </CardTitle>
            <CardDescription>Top des beats les plus téléchargés</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.popularBeats} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="downloads" fill={COLORS.pink} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition des licences */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>Répartition des licences</span>
            </CardTitle>
            <CardDescription>Distribution par type de licence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.licenseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.licenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-gray-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Actions rapides</CardTitle>
          <CardDescription>Outils d'analyse et d'export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <Calendar className="w-4 h-4 mr-2" />
              Rapport mensuel
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <Download className="w-4 h-4 mr-2" />
              Exporter données
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analyse détaillée
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnalyticsCharts;
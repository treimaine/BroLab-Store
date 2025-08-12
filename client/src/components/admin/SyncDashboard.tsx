import {
  CheckCircle,
  Database,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useServerSync } from "../../hooks/useConvexSync";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface SyncStats {
  products: {
    total: number;
    active: number;
    featured: number;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export function SyncDashboard() {
  const { syncStatus, syncWordPress, syncWooCommerce, syncAll, getStats, isLoading } =
    useServerSync();
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Charger les statistiques au montage
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await getStats();
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleSyncWordPress = async () => {
    try {
      await syncWordPress();
      await loadStats(); // Recharger les stats après sync
      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error("WordPress sync failed:", error);
    }
  };

  const handleSyncWooCommerce = async () => {
    try {
      await syncWooCommerce();
      await loadStats(); // Recharger les stats après sync
      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error("WooCommerce sync failed:", error);
    }
  };

  const handleSyncAll = async () => {
    try {
      await syncAll();
      await loadStats(); // Recharger les stats après sync
      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error("Full sync failed:", error);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (syncStatus.isSuccess) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (syncStatus.isError) return <XCircle className="h-4 w-4 text-red-500" />;
    return <RefreshCw className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isLoading) return "Synchronisation en cours...";
    if (syncStatus.isSuccess) return "Synchronisation réussie";
    if (syncStatus.isError) return "Erreur de synchronisation";
    return "Prêt à synchroniser";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord de synchronisation</h1>
          <p className="text-muted-foreground">
            Gérez la synchronisation entre Convex, WordPress et WooCommerce
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm">{getStatusText()}</span>
        </div>
      </div>

      {/* Alertes */}
      {syncStatus.isError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {syncStatus.error || "Une erreur s'est produite lors de la synchronisation"}
          </AlertDescription>
        </Alert>
      )}

      {syncStatus.isSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {syncStatus.data?.message || "Synchronisation réussie"}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produits WordPress</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.products.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.products.active || 0} actifs, {stats?.products.featured || 0} en vedette
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes WooCommerce</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(stats?.orders.byStatus || {}).length} statuts différents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dernière synchronisation</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastSync ? new Date(lastSync).toLocaleString() : "Jamais"}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastSync ? "Synchronisation automatique" : "Aucune synchronisation"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions de synchronisation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              WordPress
            </CardTitle>
            <CardDescription>Synchroniser les produits WordPress avec Convex</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSyncWordPress} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Synchroniser WordPress
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              WooCommerce
            </CardTitle>
            <CardDescription>Synchroniser les commandes WooCommerce avec Convex</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSyncWooCommerce} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Synchroniser WooCommerce
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Synchronisation complète
            </CardTitle>
            <CardDescription>Synchroniser WordPress et WooCommerce en une fois</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncAll}
              disabled={isLoading}
              className="w-full"
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synchronisation complète...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Synchronisation complète
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Détails des commandes */}
      {stats?.orders.byStatus && Object.keys(stats.orders.byStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statuts des commandes</CardTitle>
            <CardDescription>Répartition des commandes par statut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.orders.byStatus).map(([status, count]) => (
                <Badge key={status} variant="secondary">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations de configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Informations sur la configuration de synchronisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">URL Convex:</span>
            <span className="text-sm text-muted-foreground">
              {import.meta.env.VITE_CONVEX_URL || "Non configuré"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Clerk:</span>
            <span className="text-sm text-muted-foreground">
              {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? "Configuré" : "Non configuré"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">WordPress:</span>
            <span className="text-sm text-muted-foreground">
              {import.meta.env.VITE_WORDPRESS_URL ? "Configuré" : "Non configuré"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">WooCommerce:</span>
            <span className="text-sm text-muted-foreground">
              {import.meta.env.VITE_WOOCOMMERCE_URL ? "Configuré" : "Non configuré"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

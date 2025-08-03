import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";

interface StatusHistoryEntry {
  id: number;
  order_id: number;
  status: string;
  comment: string;
  created_at: string;
}

interface OrderStatusHistoryProps {
  orderId: number;
  className?: string;
}

export function OrderStatusHistory({ orderId, className }: OrderStatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  // Utiliser l'instance Supabase déjà configurée
  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/history`);
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }
      const data = await response.json();
      setHistory(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Mettre en place un polling pour les mises à jour
    const interval = setInterval(fetchHistory, 30000); // Rafraîchir toutes les 30 secondes

    return () => {
      clearInterval(interval);
    };
  }, [orderId]);

  if (isLoading) {
    return <div className="animate-pulse">Chargement de l'historique...</div>;
  }

  if (error) {
    return <div className="text-red-500">Erreur lors du chargement de l'historique : {error}</div>;
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">Historique des statuts</h3>
      <div className="space-y-4">
        {history.map((entry, index) => (
          <div key={entry.id} className="flex items-start space-x-4 relative">
            {/* Ligne verticale de connexion */}
            {index < history.length - 1 && (
              <div className="absolute left-2 top-4 w-0.5 h-full bg-gray-200" />
            )}

            {/* Point de statut */}
            <div className="relative z-10 w-4 h-4 mt-1.5 rounded-full bg-primary" />

            {/* Contenu */}
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <span className="font-medium capitalize">{entry.status}</span>
                <time className="text-sm text-gray-500">
                  {format(new Date(entry.created_at), "PPp", { locale: fr })}
                </time>
              </div>
              {entry.comment && <p className="mt-1 text-sm text-gray-600">{entry.comment}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

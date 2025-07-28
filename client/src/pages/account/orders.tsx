import { useState } from 'react';
import { useLocation } from 'wouter';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { OrderList } from '@/components/orders/OrderList';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const { isLoading: isLoadingUser } = useCurrentUser();

  if (isLoadingUser) {
    return null; // La redirection sera gérée par le layout si l'utilisateur n'est pas connecté
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/dashboard')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Historique des commandes</h1>
          <p className="text-sm text-gray-400 mt-1">
            Consultez et gérez vos commandes passées
          </p>
        </div>
      </div>

      <OrderList 
        page={page} 
        limit={10} 
        onPageChange={setPage}
      />
    </div>
  );
}
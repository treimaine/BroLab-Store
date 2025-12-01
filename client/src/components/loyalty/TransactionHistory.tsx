import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoyaltyTransactions } from "@/hooks/use-loyalty";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Gift, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

interface TransactionHistoryProps {
  userId: number;
  className?: string;
}

export function TransactionHistory({
  userId,
  className,
}: Readonly<TransactionHistoryProps>): React.ReactElement {
  const { transactions, isLoading, error } = useLoyaltyTransactions(userId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-red-400">
            Une erreur est survenue lors du chargement de l&apos;historique
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!transactions?.length) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">Aucune transaction pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earn":
        return <TrendingUp className="w-4 h-4 text-[var(--accent-green)]" />;
      case "redeem":
        return <Gift className="w-4 h-4 text-[var(--accent-purple)]" />;
      case "expire":
        return <Clock className="w-4 h-4 text-red-400" />;
      case "bonus":
        return <ShoppingCart className="w-4 h-4 text-[var(--accent-cyan)]" />;
      default:
        return <TrendingDown className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "earn":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "redeem":
        return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "expire":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "bonus":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Clock className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
          Historique des Points
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map(transaction => (
            <div
              key={`${transaction.userId}-${transaction.source}-${transaction.points}`}
              className="flex items-center justify-between p-4 bg-[var(--dark-gray)] rounded-lg"
            >
              <div className="flex items-center space-x-4">
                {getTransactionIcon(transaction.type)}
                <div>
                  <p className="text-white font-medium">
                    {transaction.description || transaction.source}
                  </p>
                  <p className="text-sm text-gray-400">
                    {format(new Date(), "PPp", { locale: fr })}
                  </p>
                </div>
              </div>
              <Badge className={getTransactionColor(transaction.type)}>
                {transaction.points > 0 ? "+" : ""}
                {transaction.points} points
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

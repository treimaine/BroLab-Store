import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { useUser } from "@clerk/clerk-react";
import { CreditCardIcon, Loader2 } from "lucide-react";
import { useState } from "react";

interface PayPalButtonProps {
  serviceType: string;
  amount: number;
  currency?: string;
  description?: string;
  reservationId: string;
  onPaymentSuccess?: (transactionId: string) => void;
  onPaymentError?: (error: string) => void;
  className?: string;
}

export function PayPalButton({
  serviceType,
  amount,
  currency = "EUR",
  description,
  reservationId,
  onPaymentSuccess,
  onPaymentError,
  className = "",
}: PayPalButtonProps) {
  const { user } = useUser();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  // Description par défaut si non fournie
  const defaultDescription = description || `${serviceType} - Reservation ${reservationId}`;

  /**
   * Gère la création de la vraie commande PayPal et la redirection
   */
  const handlePayPalPayment = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour effectuer un paiement",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("🚀 Starting REAL PayPal payment process");
      console.log("🔍 Payment details:", {
        serviceType,
        amount,
        currency,
        description: defaultDescription,
        reservationId,
        customerEmail: user.emailAddresses[0]?.emailAddress,
      });

      // ✅ APPEL RÉEL À L'API PAYPAL BACKEND
      console.log("📤 Calling PayPal backend API...");

      // ✅ ENDPOINT DIRECT: Plus besoin d'authentification
      console.log("🚀 Utilisation de l'endpoint PayPal direct (sans auth)");

      const response = await fetch("/api/paypal-direct/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceType,
          amount: amount, // ✅ CORRIGÉ: Pas de division par 100
          currency,
          description: defaultDescription,
          reservationId,
          customerEmail: user.emailAddresses[0]?.emailAddress || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ PayPal API response:", result);

      if (result.success && result.paymentUrl && result.orderId) {
        console.log("🎉 PayPal order created successfully!");
        console.log("🔗 Payment URL:", result.paymentUrl);
        console.log("🆔 Order ID:", result.orderId);

        // Afficher le message de succès
        toast({
          title: "Commande PayPal Créée !",
          description: `Redirection vers PayPal dans 3 secondes...`,
          variant: "default",
        });

        // Rediriger vers PayPal après 3 secondes
        setTimeout(() => {
          console.log("🔄 Redirecting to PayPal:", result.paymentUrl);
          window.location.href = result.paymentUrl;
        }, 3000);
      } else {
        throw new Error(result.error || "Invalid PayPal response");
      }
    } catch (error) {
      console.error("❌ PayPal payment error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

      toast({
        title: "Erreur de Paiement",
        description: errorMessage,
        variant: "destructive",
      });

      onPaymentError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Formate le prix pour l'affichage
   */
  const formatPrice = (price: number, curr: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: curr,
    }).format(price); // ✅ CORRIGÉ: Pas de division par 100
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5 text-blue-600" />
          Paiement PayPal
        </CardTitle>
        <CardDescription>Paiement sécurisé via PayPal ou carte bancaire</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé de la commande */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Service:</span>
            <Badge variant="secondary">{serviceType}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Montant:</span>
            <span className="font-semibold text-lg">{formatPrice(amount, currency)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Réservation:</span>
            <span className="text-sm font-mono">{reservationId}</span>
          </div>
        </div>

        {/* Bouton de paiement */}
        <Button
          onClick={handlePayPalPayment}
          disabled={isLoading || !user}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création du paiement...
            </>
          ) : (
            <>
              <CreditCardIcon className="mr-2 h-4 w-4" />
              Payer avec PayPal
            </>
          )}
        </Button>

        {/* Informations de sécurité */}
        <div className="text-xs text-gray-500 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CreditCardIcon className="h-3 w-3" />
            Paiement sécurisé SSL
          </div>
          <div>Accepte PayPal et cartes bancaires</div>
        </div>

        {/* Message d'information */}
        {!user && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            ⚠️ Vous devez être connecté pour effectuer un paiement
          </div>
        )}

        {/* Message de confirmation */}
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg text-center">
          ✅ Vous serez redirigé vers PayPal pour finaliser le paiement
        </div>
      </CardContent>
    </Card>
  );
}

export default PayPalButton;

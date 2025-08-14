import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import PayPalClientService from "@/services/paypal";
import { PAYPAL_PARAMS } from "@/config/paypal";
import { ArrowRight, CheckCircle, CreditCard, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

interface PaymentSuccessData {
  reservationId?: string; // ✅ CORRECTION: Optionnel car peut venir de PayPal
  serviceType?: string; // ✅ CORRECTION: Optionnel car peut venir de PayPal
  amount?: number; // ✅ CORRECTION: Optionnel car peut venir de PayPal
  transactionId?: string;
  paypalOrderId?: string; // ✅ CORRECTION: orderId PayPal
  paypalPayerId?: string; // ✅ CORRECTION: PayerID PayPal
}

export default function PaymentSuccessPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // ✅ CORRECTION: Parser les paramètres PayPal correctement
    const urlParams = new URLSearchParams(searchParams);
    
    // Paramètres PayPal standards
    const paypalToken = urlParams.get(PAYPAL_PARAMS.TOKEN); // orderId PayPal
    const paypalPayerId = urlParams.get(PAYPAL_PARAMS.PAYER_ID); // PayerID PayPal
    
    // Paramètres BroLab (optionnels)
    const reservationId = urlParams.get("reservation");
    const serviceType = urlParams.get("service");
    const amount = urlParams.get("amount");

    console.log("🎯 PayPal return parameters:", {
      token: paypalToken,
      PayerID: paypalPayerId,
      reservation: reservationId,
      service: serviceType,
      amount: amount,
    });

    if (paypalToken) {
      // ✅ CORRECTION: Priorité aux paramètres PayPal
      setPaymentData({
        paypalOrderId: paypalToken,
        paypalPayerId: paypalPayerId || undefined,
        reservationId: reservationId || undefined,
        serviceType: serviceType || undefined,
        amount: amount ? parseFloat(amount) : undefined,
      });

      // ✅ CORRECTION: Capturer automatiquement le paiement PayPal
      handlePayPalCapture(paypalToken);
    } else if (reservationId && serviceType && amount) {
      // Fallback pour les anciens paramètres
      setPaymentData({
        reservationId,
        serviceType,
        amount: parseFloat(amount),
      });
    } else {
      // ✅ CORRECTION: Gérer le cas où aucun paramètre valide n'est présent
      console.error("❌ No valid payment parameters found");
      toast({
        title: "Erreur de Paiement",
        description: "Paramètres de paiement invalides ou manquants.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  /**
   * Gère la capture du paiement PayPal
   * ✅ CORRECTION: Utilise le token PayPal (orderId) pour la capture
   */
  const handlePayPalCapture = async (paypalToken: string) => {
    setIsProcessing(true);
    try {
      console.log("🎯 Capturing PayPal payment with token:", paypalToken);

      // ✅ CORRECTION: Vérifier que c'est bien un token PayPal valide
      if (!paypalToken || paypalToken.length < PAYPAL_PARAMS.MIN_ORDER_ID_LENGTH) {
        throw new Error("Invalid PayPal token");
      }

      const result = await PayPalClientService.handlePayPalReturn(paypalToken);

      if (result.success && result.transactionId) {
        toast({
          title: "Paiement Confirmé !",
          description: `Transaction ${result.transactionId} - Votre réservation est maintenant confirmée.`,
          variant: "default",
        });

        // ✅ CORRECTION: Mettre à jour les données avec l'ID de transaction PayPal
        setPaymentData(prev => (prev ? { 
          ...prev, 
          transactionId: result.transactionId,
          paypalOrderId: paypalToken // ✅ CORRECTION: Garder l'orderId PayPal
        } : null));
      } else {
        throw new Error(result.error || "Failed to capture payment");
      }
    } catch (error) {
      console.error("❌ Error capturing PayPal payment:", error);
      toast({
        title: "Erreur de Confirmation",
        description: "Le paiement a été reçu mais la confirmation a échoué. Contactez le support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Redirige vers le dashboard
   */
  const goToDashboard = () => {
    if (paymentData) {
      // ✅ CORRECTION: Utiliser les paramètres PayPal si disponibles
      const params = new URLSearchParams();
      
      if (paymentData.paypalOrderId) {
        params.append("paypal_order", paymentData.paypalOrderId);
      }
      
      if (paymentData.reservationId) {
        params.append("reservation_success", "true");
        params.append("id", paymentData.reservationId);
      }
      
      if (paymentData.serviceType) {
        params.append("service", paymentData.serviceType);
      }
      
      if (paymentData.amount) {
        params.append("amount", paymentData.amount.toString());
      }

      const queryString = params.toString();
      setLocation(`/dashboard${queryString ? `?${queryString}` : ""}`);
    } else {
      setLocation("/dashboard");
    }
  };

  /**
   * Retour à l'accueil
   */
  const goHome = () => {
    setLocation("/");
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-[var(--deep-black)] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-[var(--accent-purple)] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des informations de paiement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-green-400">Paiement Réussi !</CardTitle>
          <CardDescription className="text-gray-300">
            Votre réservation a été confirmée et le paiement traité avec succès.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Résumé de la transaction */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white">Résumé de la Transaction</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* ✅ CORRECTION: Affichage des informations PayPal */}
              {paymentData.paypalOrderId && (
                <div>
                  <span className="text-gray-400">Order PayPal:</span>
                  <span className="text-white font-mono ml-2">{paymentData.paypalOrderId}</span>
                </div>
              )}
              
              {paymentData.paypalPayerId && (
                <div>
                  <span className="text-gray-400">Payer ID:</span>
                  <span className="text-white font-mono ml-2">{paymentData.paypalPayerId}</span>
                </div>
              )}

              {paymentData.serviceType && (
                <div>
                  <span className="text-gray-400">Service:</span>
                  <Badge variant="secondary" className="ml-2">
                    {paymentData.serviceType}
                  </Badge>
                </div>
              )}
              
              {paymentData.amount && (
                <div>
                  <span className="text-gray-400">Montant:</span>
                  <span className="text-white font-semibold ml-2">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(paymentData.amount)}
                  </span>
                </div>
              )}
              
              {paymentData.reservationId && (
                <div>
                  <span className="text-gray-400">Réservation:</span>
                  <span className="text-white font-mono ml-2">{paymentData.reservationId}</span>
                </div>
              )}
              
              {paymentData.transactionId && (
                <div>
                  <span className="text-gray-400">Transaction:</span>
                  <span className="text-white font-mono ml-2">{paymentData.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statut du traitement */}
          {isProcessing && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-blue-300">Confirmation du paiement en cours...</p>
            </div>
          )}

          {/* Message de confirmation */}
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 text-center">
            <p className="text-green-300">
              ✅ Votre réservation est maintenant confirmée et visible dans votre dashboard.
            </p>
            <p className="text-green-200 text-sm mt-2">
              Vous recevrez un email de confirmation avec tous les détails.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={goToDashboard}
              className="flex-1 bg-[var(--accent-purple)] hover:bg-purple-700 text-white"
              size="lg"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Voir ma Réservation
            </Button>

            <Button
              onClick={goHome}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Retour à l'Accueil
            </Button>
          </div>

          {/* Informations supplémentaires */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <CreditCard className="w-3 h-3" />
              Paiement sécurisé via PayPal
            </div>
            <p>Un reçu détaillé vous a été envoyé par email</p>
            <p>Pour toute question, contactez le support client</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

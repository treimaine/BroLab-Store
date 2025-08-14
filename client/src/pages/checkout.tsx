import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { ArrowLeft, CheckCircle, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

interface CheckoutData {
  reservation: string;
  amount: number;
  currency: string;
}

export default function CheckoutPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fonction pour parser les paramètres de recherche
  const getSearchParam = (param: string): string | null => {
    const urlParams = new URLSearchParams(searchParams);
    return urlParams.get(param);
  };

  useEffect(() => {
    // Récupérer les données depuis les paramètres de recherche
    const reservation = getSearchParam("reservation");
    const amount = getSearchParam("amount");
    const currency = getSearchParam("currency");

    if (reservation && amount) {
      setCheckoutData({
        reservation,
        amount: parseInt(amount),
        currency: currency || "eur",
      });
    } else {
      toast({
        title: "Données manquantes",
        description: "Les informations de réservation sont incomplètes.",
        variant: "destructive",
      });
      setLocation("/dashboard");
    }
  }, [searchParams, setLocation, toast]);

  const handlePayment = async () => {
    if (!checkoutData) return;

    setIsProcessing(true);

    try {
      // Simuler un processus de paiement
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Paiement réussi !",
        description: "Votre réservation a été confirmée",
        variant: "default",
      });

      // Rediriger vers le dashboard avec confirmation
      setLocation(`/dashboard?payment_success=true&reservation=${checkoutData.reservation}`);
    } catch (error) {
      toast({
        title: "Erreur de paiement",
        description: "Le paiement a échoué. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setLocation("/mixing-mastering");
  };

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-[var(--deep-black)] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const formattedAmount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: checkoutData.currency.toUpperCase(),
  }).format(checkoutData.amount / 100);

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux services
          </Button>
          <h1 className="text-3xl font-bold">Finaliser votre réservation</h1>
          <p className="text-gray-400 mt-2">
            Complétez votre paiement pour confirmer votre réservation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Résumé de la réservation */}
          <Card className="bg-gray-900/20 border-gray-700/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Résumé de votre réservation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Réservation ID:</span>
                <span className="font-mono text-sm">{checkoutData.reservation}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Montant:</span>
                <span className="text-2xl font-bold text-[var(--accent-purple)]">
                  {formattedAmount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Devise:</span>
                <span className="uppercase">{checkoutData.currency}</span>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire de paiement */}
          <Card className="bg-gray-900/20 border-gray-700/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[var(--accent-purple)]" />
                Informations de paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Numéro de carte
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date d'expiration
                    </label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">CVC</label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-[var(--accent-purple)] hover:bg-purple-700 py-3 text-lg"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Traitement en cours...
                    </div>
                  ) : (
                    `Payer ${formattedAmount}`
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Ceci est une démonstration. Aucun vrai paiement ne sera effectué.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

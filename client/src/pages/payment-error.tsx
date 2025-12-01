import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

interface PaymentErrorData {
  error: string;
  token?: string; // orderId PayPal si disponible
  details?: string;
}

export default function PaymentErrorPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const [errorData, setErrorData] = useState<PaymentErrorData | null>(null);

  useEffect(() => {
    // Parser les paramètres d'erreur
    const urlParams = new URLSearchParams(searchParams);
    const error = urlParams.get("error");
    const token = urlParams.get("token");
    const details = urlParams.get("details");

    if (error) {
      setErrorData({
        error,
        token: token || undefined,
        details: details || undefined,
      });

      // Afficher le toast d'erreur
      toast({
        title: "Erreur de Paiement",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  /**
   * Retourne le message d'erreur approprié
   */
  const getErrorMessage = (error: string): string => {
    switch (error) {
      case "capture_failed":
        return "Le paiement a été reçu mais la confirmation a échoué. Contactez le support.";
      case "server_error":
        return "Erreur serveur lors du traitement du paiement. Réessayez plus tard.";
      case "invalid_token":
        return "Token de paiement invalide. Vérifiez l'URL de retour.";
      case "payment_denied":
        return "Le paiement a été refusé par PayPal. Vérifiez vos informations de paiement.";
      default:
        return "Une erreur inattendue s'est produite lors du paiement.";
    }
  };

  /**
   * Retour à la page de réservation
   */
  const goBack = () => {
    if (errorData?.token) {
      // Retourner à la page de réservation avec le token
      setLocation(`/reservations?error=payment_failed&token=${errorData.token}`);
    } else {
      setLocation("/reservations");
    }
  };

  /**
   * Retour à l'accueil
   */
  const goHome = () => {
    setLocation("/");
  };

  /**
   * Réessayer le paiement
   */
  const retryPayment = () => {
    if (errorData?.token) {
      // Rediriger vers PayPal pour réessayer
      setLocation(`/api/paypal/capture/${errorData.token}`);
    } else {
      goBack();
    }
  };

  if (!errorData) {
    return (
      <div className="min-h-screen bg-[var(--deep-black)] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-[var(--accent-purple)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Analyse de l&apos;erreur de paiement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-red-400">Erreur de Paiement</CardTitle>
          <CardDescription className="text-gray-300">
            Le paiement n&apos;a pas pu être traité correctement.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Détails de l'erreur */}
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 space-y-3">
            <h3 className="text-lg font-semibold text-red-400">Détails de l&apos;Erreur</h3>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-red-300">Type d&apos;erreur:</span>
                <span className="text-white ml-2 capitalize">
                  {errorData.error.replaceAll("_", " ")}
                </span>
              </div>

              {errorData.token && (
                <div>
                  <span className="text-red-300">Order PayPal:</span>
                  <span className="text-white font-mono ml-2">{errorData.token}</span>
                </div>
              )}

              {errorData.details && (
                <div>
                  <span className="text-red-300">Détails:</span>
                  <span className="text-white ml-2">{errorData.details}</span>
                </div>
              )}
            </div>
          </div>

          {/* Message d'erreur */}
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-300">{getErrorMessage(errorData.error)}</p>
            <p className="text-gray-400 text-sm mt-2">
              Si le problème persiste, contactez le support client.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={retryPayment}
              className="flex-1 bg-[var(--accent-purple)] hover:bg-purple-700 text-white"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer le Paiement
            </Button>

            <Button
              onClick={goBack}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la Réservation
            </Button>

            <Button
              onClick={goHome}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Accueil
            </Button>
          </div>

          {/* Informations de support */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Code d&apos;erreur: {errorData.error}</p>
            {errorData.token && <p>Order ID: {errorData.token}</p>}
            <p>Heure: {new Date().toLocaleString("fr-FR")}</p>
            <p>Pour toute question, contactez le support client</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

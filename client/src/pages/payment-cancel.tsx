import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowLeft, Home, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

interface PaymentCancelData {
  reservationId?: string;
  serviceType?: string;
  amount?: number;
  reason?: string;
}

export default function PaymentCancelPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const [cancelData, setCancelData] = useState<PaymentCancelData | null>(null);

  useEffect(() => {
    // Parser les paramètres de l'URL
    const urlParams = new URLSearchParams(searchParams);
    const reservationId = urlParams.get("reservation");
    const serviceType = urlParams.get("service");
    const amount = urlParams.get("amount");
    const reason = urlParams.get("reason");

    if (reservationId || serviceType || amount) {
      setCancelData({
        reservationId: reservationId || undefined,
        serviceType: serviceType || undefined,
        amount: amount ? Number.parseFloat(amount) : undefined,
        reason: reason || undefined,
      });
    }

    // Afficher une notification d'annulation
    toast({
      title: "Paiement Annulé",
      description:
        "Votre paiement a été annulé. Votre réservation est toujours en attente de paiement.",
      variant: "destructive",
    });
  }, [searchParams, toast]);

  /**
   * Retour à la page de réservation
   */
  const goBackToReservation = () => {
    if (cancelData?.reservationId) {
      setLocation(`/mixing-mastering?reservation=${cancelData.reservationId}`);
    } else {
      setLocation("/mixing-mastering");
    }
  };

  /**
   * Retour à l'accueil
   */
  const goHome = () => {
    setLocation("/");
  };

  /**
   * Retour au dashboard
   */
  const goToDashboard = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-amber-400">Paiement Annulé</CardTitle>
          <CardDescription className="text-gray-300">
            Votre paiement a été annulé. Votre réservation est toujours en attente de paiement.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Informations sur l'annulation */}
          {cancelData && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Détails de la Réservation</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {cancelData.serviceType && (
                  <div>
                    <span className="text-gray-400">Service:</span>
                    <Badge variant="secondary" className="ml-2">
                      {cancelData.serviceType}
                    </Badge>
                  </div>
                )}
                {cancelData.amount && (
                  <div>
                    <span className="text-gray-400">Montant:</span>
                    <span className="text-white font-semibold ml-2">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      }).format(cancelData.amount)}
                    </span>
                  </div>
                )}
                {cancelData.reservationId && (
                  <div>
                    <span className="text-gray-400">Réservation:</span>
                    <span className="text-white font-mono ml-2">{cancelData.reservationId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message d'information */}
          <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-semibold text-amber-300">Important à Savoir</h4>
                <ul className="text-amber-200 text-sm space-y-1">
                  <li>• Votre réservation est toujours active et en attente de paiement</li>
                  <li>• Vous pouvez réessayer le paiement à tout moment</li>
                  <li>• Aucun montant n&apos;a été débité de votre compte</li>
                  <li>• Votre créneau de réservation est conservé</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions recommandées */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h4 className="font-semibold text-blue-300 mb-2">Que faire maintenant ?</h4>
            <div className="text-blue-200 text-sm space-y-1">
              <p>
                1. <strong>Réessayer le paiement</strong> - Cliquez sur &quot;Retour à la
                Réservation&quot;
              </p>
              <p>
                2. <strong>Vérifier vos informations</strong> - Assurez-vous que vos données sont
                correctes
              </p>
              <p>
                3. <strong>Contacter le support</strong> - Si le problème persiste
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={goBackToReservation}
              className="flex-1 bg-[var(--accent-purple)] hover:bg-purple-700 text-white"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la Réservation
            </Button>

            <Button
              onClick={goToDashboard}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              size="lg"
            >
              Voir mes Réservations
            </Button>
          </div>

          <div className="flex justify-center">
            <Button onClick={goHome} variant="ghost" className="text-gray-400 hover:text-white">
              <Home className="w-4 h-4 mr-2" />
              Retour à l&apos;Accueil
            </Button>
          </div>

          {/* Informations supplémentaires */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Pour toute question concernant votre réservation, contactez le support client</p>
            <p>Email: support@brolabentertainment.com</p>
            <p>Votre réservation reste valide pendant 24h</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Reservation } from "@shared/types/dashboard";
import { Calendar, CheckCircle, Clock, Clock4, CreditCard, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * Reservations Tab - Studio Service Bookings and Revenue Diversification
 *
 * Business Value:
 * - Diversifies revenue beyond beat sales through premium services
 * - Provides high-value mixing, mastering, and custom beat services
 * - Builds long-term customer relationships through personalized services
 * - Increases average customer lifetime value
 *
 * @see docs/dashboard-component-business-value.md for detailed analysis
 */
interface ReservationsTabProps {
  reservations?: Reservation[];
  isLoading?: boolean;
  error?: string | null;
}

export default function ReservationsTab({
  reservations = [],
  isLoading = false,
  error = null,
}: ReservationsTabProps) {
  const { toast } = useToast();
  const [limit, setLimit] = useState<number>(20);

  const localReservations = useMemo(() => {
    if (reservations && reservations.length > 0) return reservations;
    const raw = [] as Reservation[];
    return raw.map((r: Reservation) => ({
      id: String(r.id),
      serviceType: r.serviceType,
      preferredDate: r.preferredDate,
      duration: r.duration,
      totalPrice: r.totalPrice,
      status: r.status,
      details: r.details,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }, [reservations]);

  const isLoadingReservations = reservations.length === 0 || isLoading;

  useEffect(() => {
    // When provided via props, pagination is external; otherwise controlled by limit
  }, [reservations]);

  // Vérifier les paramètres URL pour les nouvelles réservations
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reservationSuccess = urlParams.get("reservation_success");
    const paymentSuccess = urlParams.get("payment_success");
    const reservationId = urlParams.get("id") || urlParams.get("reservation");

    if ((reservationSuccess === "true" || paymentSuccess === "true") && reservationId) {
      // Rafraîchir les réservations après une nouvelle réservation ou un paiement
      setTimeout(() => {
        setLimit(l => Math.max(l, 50));
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Afficher un message de succès
        if (paymentSuccess === "true") {
          toast({
            title: "Paiement confirmé !",
            description: "Votre réservation a été confirmée avec succès.",
            variant: "default",
          });
        }
      }, 1000);
    }
  }, [toast]);

  // Removed unused loadMore function

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock4 className="w-4 h-4 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return (
          <Badge variant="default" className="bg-green-600">
            Confirmée
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-600">
            En attente
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading || isLoadingReservations) {
    return (
      <div className="space-y-4">
        <h2 className="text-white flex items-center text-xl font-semibold mb-6">
          <Calendar className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
          Mes Réservations
        </h2>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-white flex items-center text-xl font-semibold mb-6">
          <Calendar className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
          Mes Réservations
        </h2>
        <p className="text-red-400">Erreur lors du chargement des réservations: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-white flex items-center text-xl font-semibold mb-6">
        <Calendar className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
        Mes Réservations
      </h2>

      {localReservations.length === 0 ? (
        <Card className="bg-gray-900/20 border-gray-700/30">
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Aucune réservation</h3>
            <p className="text-gray-400 mb-6">
              Vous n'avez pas encore de réservations de services.
            </p>
            <Button
              onClick={() => (window.location.href = "/mixing-mastering")}
              className="bg-[var(--accent-purple)] hover:bg-purple-700"
            >
              Réserver un service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {localReservations.map(reservation => (
            <Card
              key={reservation.id}
              className="bg-gray-900/20 border-gray-700/30 hover:bg-gray-900/30 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(reservation.status)}
                    <div>
                      <CardTitle className="text-lg text-white">
                        {reservation.serviceType === "mixing" && "Mixing Professionnel"}
                        {reservation.serviceType === "mastering" && "Mastering Audio"}
                        {reservation.serviceType === "custom_beat" && "Beat Personnalisé"}
                        {!["mixing", "mastering", "custom_beat"].includes(
                          reservation.serviceType
                        ) && reservation.serviceType}
                      </CardTitle>
                      <p className="text-sm text-gray-400">
                        {reservation.details.additionalServices &&
                          reservation.details.additionalServices.length > 0 &&
                          `${reservation.details.additionalServices.length} services`}
                        {reservation.details.projectDescription &&
                          ` • ${reservation.details.projectDescription.substring(0, 50)}...`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(reservation.status)}
                    <p className="text-2xl font-bold text-[var(--accent-purple)] mt-2">
                      {formatPrice(reservation.totalPrice)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="w-4 h-4" />
                      <span>Date: {formatDate(reservation.preferredDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4" />
                      <span>Durée: {reservation.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CreditCard className="w-4 h-4" />
                      <span>Statut: {reservation.status}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-300">
                      <span className="font-medium">Demandes spéciales:</span>
                      <br />
                      <span className="text-gray-400">
                        {reservation.details.requirements || "Aucune"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700/30">
                  {reservation.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          toast({
                            title: "Fonctionnalité à venir",
                            description: "La gestion des réservations sera bientôt disponible.",
                            variant: "default",
                          });
                        }}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          toast({
                            title: "Fonctionnalité à venir",
                            description: "L'annulation des réservations sera bientôt disponible.",
                            variant: "default",
                          });
                        }}
                      >
                        Annuler
                      </Button>
                    </>
                  )}
                  {reservation.status === "confirmed" && (
                    <Button
                      size="sm"
                      className="flex-1 bg-[var(--accent-purple)] hover:bg-purple-700"
                      onClick={() => {
                        toast({
                          title: "Fonctionnalité à venir",
                          description: "La gestion des sessions sera bientôt disponible.",
                          variant: "default",
                        });
                      }}
                    >
                      Gérer la session
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

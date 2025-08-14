import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/clerk-react";
import { AlertCircle, CheckCircle, CreditCard, Crown, Star, XCircle, Zap } from "lucide-react";

export function SubscriptionManager() {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">Veuillez vous connecter pour gérer votre abonnement</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abonnement Actuel */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abonnement Actuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">Aucun abonnement actif</p>
            <p className="text-sm text-gray-500">Choisissez un plan ci-dessous</p>
          </div>
        </CardContent>
      </Card>

      {/* Plans Disponibles */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Plans d'Abonnement</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan Basic */}
          <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 hover:shadow-lg transition-all duration-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Zap className="h-5 w-5" />
              </div>
              <CardTitle className="text-white">Basic</CardTitle>
              <div className="text-3xl font-bold text-orange-500">
                €9.99
                <span className="text-sm text-gray-400">/mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Licence de base</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Format MP3</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>5 téléchargements/mois</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Support email</span>
                </li>
              </ul>

              <Button className="w-full">Choisir ce Plan</Button>
            </CardContent>
          </Card>

          {/* Plan Artist */}
          <Card className="bg-gray-900 border-gray-700 ring-2 ring-purple-500">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Star className="h-5 w-5" />
              </div>
              <CardTitle className="text-white">Artist</CardTitle>
              <div className="text-3xl font-bold text-orange-500">
                €19.99
                <span className="text-sm text-gray-400">/mois</span>
              </div>
              <Badge className="bg-purple-500 hover:bg-purple-600 mx-auto">Populaire</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Licence premium</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Formats MP3 + WAV</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>20 téléchargements/mois</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Support prioritaire</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Accès anticipé</span>
                </li>
              </ul>

              <Button className="w-full" variant="secondary">
                Plan Actuel
              </Button>
            </CardContent>
          </Card>

          {/* Plan Ultimate */}
          <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 hover:shadow-lg transition-all duration-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Crown className="h-5 w-5" />
              </div>
              <CardTitle className="text-white">Ultimate</CardTitle>
              <div className="text-3xl font-bold text-orange-500">
                €49.99
                <span className="text-sm text-gray-400">/mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Licence exclusive</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Tous formats</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Téléchargements illimités</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Support 24/7</span>
                </li>
                <li className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Événements exclusifs</span>
                </li>
              </ul>

              <Button className="w-full">Choisir ce Plan</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Informations Supplémentaires */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Informations Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-400">
          <p>• Les abonnements se renouvellent automatiquement chaque mois</p>
          <p>• Vous pouvez annuler votre abonnement à tout moment</p>
          <p>• Les téléchargements sont réinitialisés chaque mois</p>
          <p>• Support technique inclus selon votre plan</p>
        </CardContent>
      </Card>
    </div>
  );
}

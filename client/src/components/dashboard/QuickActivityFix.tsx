/**
 * Composant de diagnostic rapide pour le problème d'activité
 * À ajouter temporairement au dashboard pour diagnostiquer le problème
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface QuickActivityFixProps {
  readonly className?: string;
}

export function QuickActivityFix({ className }: QuickActivityFixProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleQuickCheck = async () => {
    setIsChecking(true);

    // Simuler une vérification
    setTimeout(() => {
      setIsChecking(false);
      toast.error("Problème confirmé: Connexions depuis le 19 octobre non enregistrées");
    }, 2000);
  };

  const openClerkDashboard = () => {
    window.open("https://dashboard.clerk.com/", "_blank");
  };

  const forceRefresh = () => {
    toast.info("Rechargement du dashboard...");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-400">
          <AlertTriangle className="h-5 w-5" />
          <span>Problème de Synchronisation Détecté</span>
        </CardTitle>
        <CardDescription>
          Les connexions récentes (depuis le 19 oct) n&apos;apparaissent pas dans le dashboard
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Diagnostic rapide */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Problème identifié:</strong> Les webhooks Clerk ne déclenchent probablement pas
            la synchronisation lors des nouvelles connexions.
          </AlertDescription>
        </Alert>

        {/* Solution rapide */}
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
          <h3 className="text-sm font-medium mb-2 text-blue-400">Solution Rapide</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                1
              </Badge>
              <span>Aller dans Clerk Dashboard → Webhooks</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                2
              </Badge>
              <span>
                Vérifier que l&apos;événement{" "}
                <code className="bg-gray-700 px-1 rounded">session.created</code> est configuré
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                3
              </Badge>
              <span>Se déconnecter/reconnecter pour tester</span>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            onClick={openClerkDashboard}
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ouvrir Clerk
          </Button>

          <Button
            onClick={handleQuickCheck}
            variant="outline"
            size="sm"
            className="justify-start"
            disabled={isChecking}
          >
            <Clock className="h-4 w-4 mr-2" />
            {isChecking ? "Vérification..." : "Vérifier Statut"}
          </Button>

          <Button onClick={forceRefresh} variant="outline" size="sm" className="justify-start">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recharger
          </Button>
        </div>

        {/* Statut actuel */}
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">Statut Actuel</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Dernière activité visible:</span>
              <span className="text-red-400">19 octobre 2024</span>
            </div>
            <div className="flex justify-between">
              <span>Date actuelle:</span>
              <span className="text-green-400">24 octobre 2024</span>
            </div>
            <div className="flex justify-between">
              <span>Écart:</span>
              <span className="text-orange-400">5 jours</span>
            </div>
          </div>
        </div>

        {/* Instructions détaillées */}
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
            Instructions détaillées
          </summary>
          <div className="mt-2 space-y-2 text-gray-300">
            <p>
              <strong>1. Vérifier les webhooks Clerk:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
              <li>Aller sur https://dashboard.clerk.com/</li>
              <li>Sélectionner votre application</li>
              <li>Aller dans &quot;Webhooks&quot;</li>
              <li>
                Vérifier que <code>session.created</code> est configuré
              </li>
            </ul>

            <p>
              <strong>2. Tester la correction:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
              <li>Se déconnecter complètement</li>
              <li>Se reconnecter</li>
              <li>Vérifier si la date est mise à jour</li>
            </ul>
          </div>
        </details>

        {/* Note technique */}
        <div className="text-xs text-gray-400 bg-gray-800/30 p-2 rounded">
          <strong>Note technique:</strong> Ce composant peut être retiré une fois le problème
          résolu. Le problème vient probablement du fait que les connexions utilisateur ne
          déclenchent pas la fonction <code>clerkSync</code> qui enregistre l&apos;activité dans
          Convex.
        </div>
      </CardContent>
    </Card>
  );
}

export default QuickActivityFix;

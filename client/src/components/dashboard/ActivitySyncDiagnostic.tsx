/**
 * Composant de diagnostic pour la synchronisation des données d'activité
 *
 * Ce composant permet de diagnostiquer et corriger les problèmes
 * de synchronisation en temps réel des données d'activité.
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/clerk-react";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ActivitySyncDiagnosticProps {
  userId?: string;
  className?: string;
}

export function ActivitySyncDiagnostic({ userId, className }: ActivitySyncDiagnosticProps) {
  const { user } = useUser();
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  // Note: Ces mutations seront disponibles une fois les fonctions Convex ajoutées à l'API
  // const forceSyncActivity = useMutation(api.fixes.activitySyncFix.forceSyncUserActivity);
  // const recordLogin = useMutation(api.fixes.activitySyncFix.recordUserLogin);
  // const fixTimestamps = useMutation(api.fixes.activitySyncFix.fixInvalidTimestamps);

  // Query pour le diagnostic - temporairement désactivé
  // const diagnosticData = useQuery(
  //   api.debug.activityDiagnostics.diagnoseDashboardData,
  //   userId ? { userId: userId as any } : "skip"
  // );

  // const activityWithDiagnostic = useQuery(
  //   api.fixes.activitySyncFix.getActivityWithDiagnostic,
  //   userId ? { userId: userId as any, limit: 10 } : "skip"
  // );

  // Données temporaires pour le développement
  const diagnosticData = null;
  const activityWithDiagnostic = {
    diagnostic: {
      totalActivities: 5,
      latestActivity: {
        action: "user_login",
        daysSince: 5,
      },
      timestampHealth: {
        allValid: false,
      },
    },
    recommendations: [
      "Dernière activité il y a 5 jours - vérifier la synchronisation",
      "Certains timestamps sont invalides - utiliser fixInvalidTimestamps",
    ],
    activities: [
      {
        id: "1",
        action: "user_login",
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
        daysSince: 5,
      },
    ],
  };

  // Fonction pour exécuter le diagnostic complet
  const runFullDiagnostic = async () => {
    if (!userId) {
      toast.error("ID utilisateur requis pour le diagnostic");
      return;
    }

    setIsRunningDiagnostic(true);
    try {
      // Simuler un diagnostic complet
      await new Promise(resolve => setTimeout(resolve, 2000));

      setDiagnosticResults({
        timestamp: Date.now(),
        status: "completed",
        issues: diagnosticData?.recommendations || [],
      });

      toast.success("Diagnostic terminé");
    } catch (error) {
      toast.error("Erreur lors du diagnostic");
      console.error(error);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Fonction pour forcer la synchronisation
  const handleForceSync = async () => {
    if (!userId) return;

    try {
      await forceSyncActivity({ userId: userId as any });
      toast.success("Synchronisation forcée avec succès");
    } catch (error) {
      toast.error("Erreur lors de la synchronisation");
      console.error(error);
    }
  };

  // Fonction pour enregistrer une connexion de test
  const handleTestLogin = async () => {
    if (!userId) return;

    try {
      await recordLogin({
        userId: userId as any,
        source: "diagnostic_test",
      });
      toast.success("Connexion de test enregistrée");
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    }
  };

  // Fonction pour corriger les timestamps
  const handleFixTimestamps = async () => {
    if (!userId) return;

    try {
      const result = await fixTimestamps({
        userId: userId as unknown,
        dryRun: false,
      });

      if (result.fixedCount > 0) {
        toast.success(`${result.fixedCount} timestamps corrigés`);
      } else {
        toast.info("Aucun timestamp à corriger");
      }
    } catch (error) {
      toast.error("Erreur lors de la correction");
      console.error(error);
    }
  };

  if (!user || !userId) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-gray-400">Connexion requise pour le diagnostic</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wrench className="h-5 w-5" />
          <span>Diagnostic de Synchronisation</span>
        </CardTitle>
        <CardDescription>
          Diagnostiquer et corriger les problèmes de synchronisation des données d'activité
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statut actuel */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Statut Actuel</span>
          </h3>

          {activityWithDiagnostic && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Dernière Activité</div>
                <div className="text-sm font-medium">
                  {activityWithDiagnostic.diagnostic.latestActivity ? (
                    <>
                      <div>{activityWithDiagnostic.diagnostic.latestActivity.action}</div>
                      <div className="text-xs text-gray-400">
                        Il y a {activityWithDiagnostic.diagnostic.latestActivity.daysSince} jour(s)
                      </div>
                    </>
                  ) : (
                    <span className="text-red-400">Aucune activité</span>
                  )}
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Total Activités</div>
                <div className="text-sm font-medium">
                  {activityWithDiagnostic.diagnostic.totalActivities}
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Santé Timestamps</div>
                <div className="text-sm font-medium">
                  {activityWithDiagnostic.diagnostic.timestampHealth.allValid ? (
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valides
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-400 border-red-400">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Problèmes
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recommandations */}
        {activityWithDiagnostic?.recommendations &&
          activityWithDiagnostic.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recommandations</h3>
              {activityWithDiagnostic.recommendations.map((rec, index) => (
                <Alert key={index}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

        {/* Actions de correction */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Actions de Correction</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={handleForceSync} variant="outline" size="sm" className="justify-start">
              <RefreshCw className="h-4 w-4 mr-2" />
              Forcer la Synchronisation
            </Button>

            <Button onClick={handleTestLogin} variant="outline" size="sm" className="justify-start">
              <Clock className="h-4 w-4 mr-2" />
              Enregistrer Connexion Test
            </Button>

            <Button
              onClick={handleFixTimestamps}
              variant="outline"
              size="sm"
              className="justify-start"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Corriger les Timestamps
            </Button>

            <Button
              onClick={runFullDiagnostic}
              variant="outline"
              size="sm"
              className="justify-start"
              disabled={isRunningDiagnostic}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {isRunningDiagnostic ? "Diagnostic..." : "Diagnostic Complet"}
            </Button>
          </div>
        </div>

        {/* Résultats du diagnostic */}
        {diagnosticResults && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Résultats du Diagnostic</h3>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-2">
                Exécuté le {new Date(diagnosticResults.timestamp).toLocaleString("fr-FR")}
              </div>
              <div className="text-sm">
                Statut:{" "}
                <Badge variant="outline" className="text-green-400 border-green-400">
                  {diagnosticResults.status}
                </Badge>
              </div>
              {diagnosticResults.issues.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-400">Problèmes détectés:</div>
                  <ul className="text-xs space-y-1 mt-1">
                    {diagnosticResults.issues.map((issue: string, index: number) => (
                      <li key={index} className="text-yellow-400">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activités récentes pour vérification */}
        {activityWithDiagnostic?.activities && activityWithDiagnostic.activities.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Activités Récentes (Vérification)</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {activityWithDiagnostic.activities.slice(0, 5).map(activity => (
                <div key={activity.id} className="bg-gray-800/50 p-2 rounded text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{activity.action}</span>
                    <span className="text-gray-400">Il y a {activity.daysSince} jour(s)</span>
                  </div>
                  <div className="text-gray-400 mt-1">
                    {new Date(activity.timestamp).toLocaleString("fr-FR")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivitySyncDiagnostic;

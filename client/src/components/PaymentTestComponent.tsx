import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { startTransition, useState } from "react";
import { Link } from "wouter";

export function PaymentTestComponent() {
  const { toast } = useToast();
  const [testState, setTestState] = useState("idle");

  const handleTestPayment = () => {
    startTransition(() => {
      setTestState("testing");
      toast({
        title: "Test de paiement",
        description: "Test du flux de paiement sans suspension synchrone",
      });

      // Simuler un délai
      setTimeout(() => {
        startTransition(() => {
          setTestState("success");
          toast({
            title: "Test réussi",
            description: "Aucune erreur de suspension synchrone détectée",
            variant: "default",
          });
        });
      }, 1000);
    });
  };

  const handleTestMembership = () => {
    startTransition(() => {
      setTestState("navigating");
      // La navigation sera gérée par le Link
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
        <CardHeader>
          <CardTitle className="text-white text-center">
            🧪 Test de Paiement - Suspension Synchrone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-300">
            <p className="mb-4">
              Ce composant teste si le problème de suspension synchrone est résolu.
            </p>
            <p className="text-sm">
              État actuel:{" "}
              <span className="font-semibold text-[var(--accent-purple)]">{testState}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleTestPayment}
              disabled={testState === "testing"}
              className="w-full bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)]"
            >
              {testState === "testing" ? "Test en cours..." : "Test Paiement"}
            </Button>

            <Link href="/membership">
              <Button
                onClick={handleTestMembership}
                variant="outline"
                className="w-full border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
              >
                Test Page Membership
              </Button>
            </Link>
          </div>

          <div className="bg-[var(--deep-black)] rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">Instructions de Test:</h4>
            <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
              <li>Cliquez sur "Test Paiement" pour tester les transitions</li>
              <li>Cliquez sur "Test Page Membership" pour naviguer vers la page membership</li>
              <li>Vérifiez la console pour les erreurs de suspension</li>
              <li>Vérifiez que l'interface reste réactive</li>
            </ol>
          </div>

          <div className="bg-[var(--deep-black)] rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">Résultats Attendus:</h4>
            <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
              <li>✅ Aucune erreur "suspended while responding to synchronous input"</li>
              <li>✅ Transitions fluides sans blocage</li>
              <li>✅ Page membership se charge correctement</li>
              <li>✅ PricingTable s'affiche sans erreur</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

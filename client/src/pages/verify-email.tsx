import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";

export default function VerifyEmailPage() {
  const search = useSearch();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "invalid">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (!token) {
      setStatus("invalid");
      setMessage("Token de vérification manquant");
      return;
    }

    // Verify email with token
    const verifyEmail = async () => {
      try {
        const response = await apiRequest("GET", `/api/email/verify-email?token=${token}`);
        const data = await response.json();

        if (data.success) {
          setStatus("success");
          setMessage("Votre email a été vérifié avec succès !");

          toast({
            title: "Email vérifié",
            description: "Vous pouvez maintenant vous connecter à votre compte.",
          });
        } else {
          setStatus("error");
          setMessage(data.message || "Erreur lors de la vérification");
        }
      } catch (error: unknown) {
        setStatus("error");
        setMessage("Erreur de connexion au serveur");
        console.error("Email verification error:", error);
      }
    };

    verifyEmail();
  }, [search, toast]);

  const renderIcon = () => {
    switch (status) {
      case "loading":
        return <Mail className="h-12 w-12 text-blue-500 animate-pulse" />;
      case "success":
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case "error":
      case "invalid":
        return <AlertCircle className="h-12 w-12 text-red-500" />;
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <>
            <CardTitle className="text-xl text-center">Vérification en cours...</CardTitle>
            <CardContent className="text-center pt-6">
              <p className="text-muted-foreground mb-4">
                Nous vérifions votre adresse email, veuillez patienter.
              </p>
            </CardContent>
          </>
        );

      case "success":
        return (
          <>
            <CardTitle className="text-xl text-center text-green-600">Email vérifié !</CardTitle>
            <CardContent className="text-center pt-6">
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/login">Se connecter</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/">Retour à l&apos;accueil</Link>
                </Button>
              </div>
            </CardContent>
          </>
        );

      case "error":
      case "invalid":
        return (
          <>
            <CardTitle className="text-xl text-center text-red-600">
              Erreur de vérification
            </CardTitle>
            <CardContent className="text-center pt-6">
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/signup">Créer un nouveau compte</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/">Retour à l&apos;accueil</Link>
                </Button>
              </div>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">{renderIcon()}</div>
            {renderContent()}
          </CardHeader>
        </Card>

        {/* Help section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">Besoin d&apos;aide ?</p>
          <Link href="/contact" className="text-sm text-primary hover:underline">
            Contactez notre support
          </Link>
        </div>
      </div>
    </div>
  );
}

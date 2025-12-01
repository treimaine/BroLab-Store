import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Key } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useSearch } from "wouter";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "form" | "success" | "error" | "invalid">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const urlToken = params.get("token");

    if (!urlToken) {
      setStatus("invalid");
      setMessage("Token de réinitialisation manquant");
      return;
    }

    // Validate token format (UUID)
    if (urlToken.length !== 36) {
      setStatus("invalid");
      setMessage("Token de réinitialisation invalide");
      return;
    }

    setToken(urlToken);
    setStatus("form");
  }, [search]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    try {
      const response = await apiRequest("POST", "/api/email/reset-password", {
        token,
        password: data.password,
      });

      const result = await response.json();

      if (result.success) {
        setStatus("success");
        setMessage("Votre mot de passe a été réinitialisé avec succès !");

        toast({
          title: "Mot de passe réinitialisé",
          description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
        });

        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation("/login");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(result.message || "Erreur lors de la réinitialisation");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage("Erreur de connexion au serveur");
      console.error("Password reset error:", error);
    }
  };

  const renderIcon = () => {
    switch (status) {
      case "loading":
        return <Key className="h-12 w-12 text-blue-500 animate-pulse" />;
      case "form":
        return <Key className="h-12 w-12 text-primary" />;
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
            <CardTitle className="text-xl text-center">Vérification...</CardTitle>
            <CardContent className="text-center pt-6">
              <p className="text-muted-foreground mb-4">
                Vérification du token de réinitialisation...
              </p>
            </CardContent>
          </>
        );

      case "form":
        return (
          <>
            <CardTitle className="text-xl text-center">Nouveau mot de passe</CardTitle>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Entrez votre nouveau mot de passe"
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer le mot de passe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirmez votre nouveau mot de passe"
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting
                      ? "Réinitialisation..."
                      : "Réinitialiser le mot de passe"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        );

      case "success":
        return (
          <>
            <CardTitle className="text-xl text-center text-green-600">
              Mot de passe réinitialisé !
            </CardTitle>
            <CardContent className="text-center pt-6">
              <p className="text-muted-foreground mb-6">{message}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Redirection automatique vers la page de connexion...
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Se connecter maintenant</Link>
              </Button>
            </CardContent>
          </>
        );

      case "error":
      case "invalid":
        return (
          <>
            <CardTitle className="text-xl text-center text-red-600">Erreur</CardTitle>
            <CardContent className="text-center pt-6">
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/forgot-password">Demander un nouveau lien</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/login">Retour à la connexion</Link>
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

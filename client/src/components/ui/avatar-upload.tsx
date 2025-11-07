import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/clerk-react";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DEFAULT_AVATAR = "/assets/default-avatar.svg";

interface AvatarUploadProps {
  readonly src?: string | null;
  readonly alt?: string;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
  readonly onUpload?: (url: string) => void;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
} as const;

export function AvatarUpload({
  src,
  alt = "User avatar",
  size = "md",
  className,
  onUpload,
}: AvatarUploadProps) {
  const [imgSrc, setImgSrc] = useState(src || DEFAULT_AVATAR);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();

  // Mettre à jour imgSrc quand src change
  useEffect(() => {
    setImgSrc(src || DEFAULT_AVATAR);
  }, [src]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation du fichier
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez sélectionner un fichier image valide.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      toast({
        title: "Erreur de validation",
        description: "Le fichier est trop volumineux. Taille maximale : 5MB.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour uploader un avatar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      // Use the Express API endpoint which handles Convex upload
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/avatar/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const { url } = await response.json();
      setImgSrc(url);
      onUpload?.(url);

      toast({
        title: "Avatar mis à jour",
        description: "Votre photo de profil a été mise à jour avec succès.",
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'avatar. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset l'input pour permettre la sélection du même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      <img
        src={imgSrc}
        alt={alt}
        className={cn(
          sizeClasses[size],
          "rounded-full object-cover border-2 border-[var(--accent-purple)]",
          className
        )}
        onError={() => {
          if (imgSrc !== DEFAULT_AVATAR) {
            setImgSrc(DEFAULT_AVATAR);
            toast({
              title: "Erreur",
              description: "Impossible de charger l'avatar",
              variant: "destructive",
            });
          }
        }}
      />

      <button
        type="button"
        onClick={triggerFileInput}
        disabled={isUploading}
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full",
          "bg-black bg-opacity-50 transition-opacity duration-200",
          "opacity-0 group-hover:opacity-100",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)] focus:ring-offset-2",
          isUploading && "opacity-100"
        )}
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : (
          <Camera className="w-4 h-4 text-white" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

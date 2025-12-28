import { cn } from "@/lib/utils";
import { notificationService } from "@/services/NotificationService";
import { useEffect, useRef, useState } from "react";

const DEFAULT_AVATAR = "/assets/default-avatar.svg";

interface AvatarProps {
  readonly src?: string | null;
  readonly alt?: string;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
  readonly editable?: boolean;
  readonly onUpload?: (url: string) => void;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
} as const;

export function Avatar({
  src,
  alt = "User avatar",
  size = "md",
  className,
  editable = false,
  onUpload,
}: AvatarProps) {
  const [imgSrc, setImgSrc] = useState(src || DEFAULT_AVATAR);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update imgSrc when src changes
  useEffect(() => {
    setImgSrc(src || DEFAULT_AVATAR);
  }, [src]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/avatar/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();
      setImgSrc(url);
      onUpload?.(url);
    } catch (error) {
      console.error("Avatar upload error:", error);
      notificationService.error("Unable to update avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative group">
      <img
        src={imgSrc}
        alt={alt}
        className={cn(
          sizeClasses[size],
          "rounded-full object-cover border-2",
          isUploading ? "opacity-50 border-gray-400" : "border-[var(--accent-purple)]",
          editable && "cursor-pointer",
          className
        )}
        onError={() => {
          if (imgSrc !== DEFAULT_AVATAR) {
            setImgSrc(DEFAULT_AVATAR);
            notificationService.error("Unable to load avatar");
          }
        }}
      />
      {editable && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-full",
              "bg-black bg-opacity-50 transition-opacity duration-200",
              "opacity-0 group-hover:opacity-100 focus:opacity-100",
              "focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)] focus:ring-offset-2"
            )}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </>
      )}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        </div>
      )}
    </div>
  );
}

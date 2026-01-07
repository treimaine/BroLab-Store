import {
  useConvexAuth,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface DownloadData {
  productId: number;
  productName: string;
  license: string;
  price: number;
}

// Type for download records returned from Convex (matches schema)
export interface DownloadRecord {
  _id: Id<"downloads">;
  _creationTime: number;
  userId: Id<"users">;
  beatId: number;
  licenseType: string;
  downloadUrl?: string;
  fileSize?: number;
  downloadCount?: number;
  expiresAt?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
}

// Type for mutation arguments
interface LogDownloadArgs {
  productId: number;
  productName: string;
  license: string;
  price: number;
}

// Type for the mutation function
type LogDownloadMutation = (args: LogDownloadArgs) => Promise<DownloadRecord | null>;

export function useDownloads() {
  const { isAuthenticated } = useConvexAuth();

  // FIX: Check if Convex queries should be active (visibility-aware)
  const isConvexEnabled = useConvexQueryEnabled();

  // Lister les téléchargements avec Convex
  // Type assertion needed due to Convex deep type instantiation issue
  // FIX: Skip query when tab is hidden to prevent freeze
  const downloads = useConvexQuery(
    api.downloads.getUserDownloads,
    isConvexEnabled ? {} : "skip"
  ) as DownloadRecord[] | undefined;

  // Logger un téléchargement avec Convex
  // Type assertion needed due to Convex deep type instantiation issue
  const logDownloadMutation = useConvexMutation(
    api.downloads.logDownload
  ) as unknown as LogDownloadMutation;

  const logDownload = async (downloadData: DownloadData): Promise<DownloadRecord | null> => {
    if (!isAuthenticated) {
      const error = new Error("Please log in to download this beat.");
      error.name = "AUTHENTICATION_REQUIRED";
      throw error;
    }

    try {
      // Retirer clerkId des données car il est automatiquement récupéré par Convex
      const { productId, productName, license, price } = downloadData;
      const result = await logDownloadMutation({
        productId,
        productName,
        license,
        price,
      });
      return result;
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      throw error;
    }
  };

  return {
    downloads: downloads ?? [],
    isLoading: downloads === undefined,
    logDownload,
    isAuthenticated,
  };
}

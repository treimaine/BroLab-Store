import {
  useConvexAuth,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";

export interface DownloadData {
  productId: number;
  productName: string;
  license: string;
  price: number;
}

export function useDownloads() {
  const { isAuthenticated } = useConvexAuth();

  // Lister les téléchargements avec Convex
  const downloads = useConvexQuery(api.downloads.getUserDownloads, {});

  // Logger un téléchargement avec Convex
  const logDownloadMutation = useConvexMutation(api.downloads.logDownload);

  const logDownload = async (downloadData: DownloadData) => {
    if (!isAuthenticated) {
      throw new Error("Vous devez être connecté pour télécharger");
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
    downloads: downloads || [],
    isLoading: downloads === undefined,
    logDownload,
    isAuthenticated,
  };
}

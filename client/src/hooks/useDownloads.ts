// @ts-nocheck
import {
  useConvexAuth,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
// Casting Convex generated API to any to avoid deep instantiation issues in React hooks
// See known issue note in project rules for similar workaround
import { api as generatedApi } from "../../../convex/_generated/api";
const api: any = generatedApi as any;

export interface DownloadData {
  productId: number;
  productName: string;
  license: string;
  price: number;
}

export function useDownloads() {
  const { isAuthenticated } = useConvexAuth();

  // Lister les téléchargements avec Convex
  // Avoid TS2589 by relaxing types for generated query and args
  const downloads = useConvexQuery(api.downloads.getUserDownloads as any, {} as any) as any;

  // Logger un téléchargement avec Convex
  const logDownloadMutation = useConvexMutation(api.downloads.logDownload as any) as any;

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

import { apiService } from "@/services/ApiService";
import { useEffect, useState } from "react";

/**
 * Hook to use Open Graph meta tags in components
 */
export function useOpenGraphMeta(
  type: "beat" | "shop" | "home" | "page",
  beatId?: number,
  pageName?: "about" | "contact" | "terms" | "privacy" | "license"
): string {
  const [openGraphHTML, setOpenGraphHTML] = useState<string>("");

  useEffect(() => {
    const fetchOpenGraph = async (): Promise<void> => {
      try {
        let endpoint = "";

        switch (type) {
          case "beat":
            if (!beatId) return;
            endpoint = `/opengraph/beat/${beatId}`;
            break;
          case "shop":
            endpoint = "/opengraph/shop";
            break;
          case "home":
            endpoint = "/opengraph/home";
            break;
          case "page":
            if (!pageName) return;
            endpoint = `/opengraph/page/${pageName}`;
            break;
          default:
            return;
        }

        const response = await apiService.get<string>(endpoint);
        setOpenGraphHTML(response.data);
      } catch (error) {
        console.error("Error fetching Open Graph meta tags:", error);
      }
    };

    fetchOpenGraph();
  }, [type, beatId, pageName]);

  return openGraphHTML;
}

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
            endpoint = `/api/opengraph/beat/${beatId}`;
            break;
          case "shop":
            endpoint = "/api/opengraph/shop";
            break;
          case "home":
            endpoint = "/api/opengraph/home";
            break;
          case "page":
            if (!pageName) return;
            endpoint = `/api/opengraph/page/${pageName}`;
            break;
          default:
            return;
        }

        const response = await fetch(endpoint);
        if (response.ok) {
          const html = await response.text();
          setOpenGraphHTML(html);
        }
      } catch (error) {
        console.error("Error fetching Open Graph meta tags:", error);
      }
    };

    fetchOpenGraph();
  }, [type, beatId, pageName]);

  return openGraphHTML;
}

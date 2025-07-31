import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

interface OpenGraphMetaProps {
  type: "beat" | "shop" | "home" | "page";
  beatId?: number;
  pageName?: "about" | "contact" | "terms" | "privacy" | "license";
}

/**
 * Composant pour injecter les meta tags Open Graph dans le head
 * Utilise react-helmet-async pour la cohérence avec l'UI existante
 */
export function OpenGraphMeta({ type, beatId, pageName }: OpenGraphMetaProps) {
  const [openGraphHTML, setOpenGraphHTML] = useState<string>("");

  useEffect(() => {
    const fetchOpenGraph = async () => {
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
        } else {
          console.warn("Failed to fetch Open Graph meta tags:", response.status);
        }
      } catch (error) {
        console.error("Error fetching Open Graph meta tags:", error);
      }
    };

    fetchOpenGraph();
  }, [type, beatId, pageName]);

  if (!openGraphHTML) {
    return null;
  }

  // Parser le HTML pour extraire les meta tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(openGraphHTML, "text/html");
  const metaTags = Array.from(doc.querySelectorAll("meta"));

  return (
    <Helmet>
      {metaTags.map((meta, index) => {
        const attrs: any = {};
        for (let i = 0; i < meta.attributes.length; i++) {
          const attr = meta.attributes[i];
          attrs[attr.name] = attr.value;
        }
        return <meta key={index} {...attrs} />;
      })}
    </Helmet>
  );
}

/**
 * Hook pour utiliser les meta tags Open Graph dans les composants
 */
export function useOpenGraphMeta(
  type: "beat" | "shop" | "home" | "page",
  beatId?: number,
  pageName?: "about" | "contact" | "terms" | "privacy" | "license"
) {
  const [openGraphHTML, setOpenGraphHTML] = useState<string>("");

  useEffect(() => {
    const fetchOpenGraph = async () => {
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

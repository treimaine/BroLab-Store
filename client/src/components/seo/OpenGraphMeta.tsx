import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

interface OpenGraphMetaProps {
  readonly type: "beat" | "shop" | "home" | "page";
  readonly beatId?: number;
  readonly pageName?: "about" | "contact" | "terms" | "privacy" | "license";
}

/**
 * Component to inject Open Graph meta tags into the head
 * Uses react-helmet-async for consistency with existing UI
 */
export function OpenGraphMeta({ type, beatId, pageName }: Readonly<OpenGraphMetaProps>) {
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

  // Parse HTML to extract meta tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(openGraphHTML, "text/html");
  const metaTags = Array.from(doc.querySelectorAll("meta"));

  return (
    <Helmet>
      {metaTags.map(meta => {
        const attrs: Record<string, string> = {};
        for (const attr of meta.attributes) {
          attrs[attr.name] = attr.value;
        }
        // Use property or content as unique key
        const key = attrs.property || attrs.name || attrs.content;
        return <meta key={key} {...attrs} />;
      })}
    </Helmet>
  );
}

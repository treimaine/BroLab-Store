import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

interface SchemaMarkupProps {
  type: "beat" | "beats-list" | "organization";
  beatId?: number;
  beatData?: any;
  baseUrl?: string;
}

/**
 * Composant pour injecter le Schema markup JSON-LD dans le head
 * Utilise react-helmet-async pour la cohérence avec l'UI existante
 */
export function SchemaMarkup({
  type,
  beatId,
  beatData,
  baseUrl = "https://brolabentertainment.com",
}: SchemaMarkupProps) {
  const [schemaMarkup, setSchemaMarkup] = useState<string>("");

  useEffect(() => {
    const fetchSchemaMarkup = async () => {
      try {
        let endpoint = "";

        switch (type) {
          case "beat":
            if (!beatId) return;
            endpoint = `/api/schema/beat/${beatId}`;
            break;
          case "beats-list":
            endpoint = "/api/schema/beats-list";
            break;
          case "organization":
            endpoint = "/api/schema/organization";
            break;
          default:
            return;
        }

        const response = await fetch(endpoint);
        if (response.ok) {
          const markup = await response.text();
          setSchemaMarkup(markup);
        } else {
          console.warn("Failed to fetch schema markup:", response.status);
        }
      } catch (error) {
        console.error("Error fetching schema markup:", error);
      }
    };

    fetchSchemaMarkup();
  }, [type, beatId, baseUrl]);

  if (!schemaMarkup) {
    return null;
  }

  return (
    <Helmet>
      <script type="application/ld+json">{schemaMarkup}</script>
    </Helmet>
  );
}

/**
 * Hook pour utiliser le Schema markup dans les composants
 */
export function useSchemaMarkup(type: "beat" | "beats-list" | "organization", beatId?: number) {
  const [schemaMarkup, setSchemaMarkup] = useState<string>("");

  useEffect(() => {
    const fetchSchemaMarkup = async () => {
      try {
        let endpoint = "";

        switch (type) {
          case "beat":
            if (!beatId) return;
            endpoint = `/api/schema/beat/${beatId}`;
            break;
          case "beats-list":
            endpoint = "/api/schema/beats-list";
            break;
          case "organization":
            endpoint = "/api/schema/organization";
            break;
          default:
            return;
        }

        const response = await fetch(endpoint);
        if (response.ok) {
          const markup = await response.text();
          setSchemaMarkup(markup);
        }
      } catch (error) {
        console.error("Error fetching schema markup:", error);
      }
    };

    fetchSchemaMarkup();
  }, [type, beatId]);

  return schemaMarkup;
}

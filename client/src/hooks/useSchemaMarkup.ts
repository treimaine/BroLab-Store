import { apiService } from "@/services/ApiService";
import { useEffect, useState } from "react";

/**
 * Hook to fetch and use Schema markup in components
 */
export function useSchemaMarkup(
  type: "beat" | "beats-list" | "organization",
  beatId?: number
): string {
  const [schemaMarkup, setSchemaMarkup] = useState<string>("");

  useEffect(() => {
    const fetchSchemaMarkup = async (): Promise<void> => {
      try {
        let endpoint = "";

        switch (type) {
          case "beat":
            if (!beatId) return;
            endpoint = `/schema/beat/${beatId}`;
            break;
          case "beats-list":
            endpoint = "/schema/beats-list";
            break;
          case "organization":
            endpoint = "/schema/organization";
            break;
          default:
            return;
        }

        const response = await apiService.get<string>(endpoint);
        setSchemaMarkup(response.data);
      } catch (error) {
        console.error("Error fetching schema markup:", error);
      }
    };

    void fetchSchemaMarkup();
  }, [type, beatId]);

  return schemaMarkup;
}

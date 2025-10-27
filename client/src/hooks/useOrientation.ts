import { useEffect, useState } from "react";

type Orientation = "portrait" | "landscape";

/**
 * Hook to detect device orientation
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(
    window.innerWidth > window.innerHeight ? "landscape" : "portrait"
  );

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return orientation;
}

import { api } from "@convex/_generated/api";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

export { api, convex };

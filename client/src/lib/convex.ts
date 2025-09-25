import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

export { api, convex };

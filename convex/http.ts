import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Clerk webhook temporarily disabled in dev to unblock Convex deploy.
// Provide a minimal PublicHttpAction-compliant handler.
const okStub = httpAction(async () => new Response("OK", { status: 200 }));

http.route({
  path: "/api/webhooks/clerk",
  method: "POST",
  handler: okStub,
});

export default http;

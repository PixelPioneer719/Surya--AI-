import { auth } from "@/auth";
import { db } from "@/lib/insforge";
import type { ConnectorToken } from "@/types/connector";

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");

  if (provider !== "google" && provider !== "github") {
    return Response.json({ error: "Invalid provider. Must be 'google' or 'github'." }, { status: 400 });
  }

  const email = session.user.email;

  const existing = (await db.connectorTokens("findOne", {
    filter: { email, provider },
  })) as { document: ConnectorToken | null };

  if (!existing.document) {
    return Response.json({ error: "Not connected" }, { status: 404 });
  }

  await db.connectorTokens("deleteOne", { filter: { email, provider } });

  return Response.json({ success: true });
}

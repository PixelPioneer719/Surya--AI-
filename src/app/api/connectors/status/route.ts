import { auth } from "@/auth";
import { db } from "@/lib/insforge";
import type { ConnectorToken } from "@/types/connector";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userEmail = session.user.email;

  const result = (await db.connectorTokens("find", {
    filter: { email: userEmail },
  })) as { documents: ConnectorToken[] };

  const tokens = result.documents ?? [];

  const google = tokens.find((t) => t.provider === "google");
  const github = tokens.find((t) => t.provider === "github");

  return Response.json({
    google: {
      connected: !!google,
      email: google ? userEmail : undefined,
      expiresAt: google?.expiresAt,
    },
    github: {
      connected: !!github,
    },
  });
}

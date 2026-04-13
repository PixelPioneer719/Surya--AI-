import { auth } from "@/auth";
import { getGoogleClient, isConnectorError } from "@/lib/google-apis";
import { google } from "googleapis";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userEmail = session.user.email;
  const body = await req.json();
  const { action } = body;

  try {
    const oauth2Client = await getGoogleClient(userEmail);
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    if (action === "list") {
      const { query, maxResults = 10 } = body;
      const q = query
        ? `${query} and trashed = false`
        : "trashed = false";

      const res = await drive.files.list({
        q,
        pageSize: Math.min(maxResults, 20),
        fields: "files(id, name, mimeType, modifiedTime, size)",
        orderBy: "modifiedTime desc",
      });

      return Response.json({ files: res.data.files ?? [] });
    }

    if (action === "read") {
      const { fileId } = body;

      // Get file metadata to determine type
      const meta = await drive.files.get({
        fileId,
        fields: "id, name, mimeType",
      });

      const mimeType = meta.data.mimeType ?? "";

      // Export Google Workspace files as plain text
      if (mimeType.startsWith("application/vnd.google-apps")) {
        const exportMime =
          mimeType === "application/vnd.google-apps.spreadsheet"
            ? "text/csv"
            : "text/plain";

        const exported = await drive.files.export(
          { fileId, mimeType: exportMime },
          { responseType: "text" }
        );

        const content = (exported.data as string).slice(0, 12000);
        return Response.json({ name: meta.data.name, content });
      }

      // Binary/other files: return metadata only
      return Response.json({
        name: meta.data.name,
        content: `[Binary file — cannot display inline. Type: ${mimeType}]`,
      });
    }

    return new Response(`Unknown action: ${action}`, { status: 400 });
  } catch (err) {
    if (isConnectorError(err)) {
      return Response.json({ error: err.message, code: err.code }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

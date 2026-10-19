import { createFileRoute } from "@tanstack/react-router";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 300;
const allowedContentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
]);

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("upload"),
    tripId: z.string().uuid(),
    fileName: z.string().min(1).max(255),
    contentType: z.string().min(1).max(150),
    fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
  }),
  z.object({
    action: z.literal("download"),
    tripId: z.string().uuid(),
    storagePath: z.string().min(1).max(1024),
  }),
  z.object({
    action: z.literal("delete"),
    tripId: z.string().uuid(),
    storagePath: z.string().min(1).max(1024),
  }),
]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function getConfig() {
  const { AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
  if (!AWS_REGION || !AWS_S3_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      "AWS S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.",
    );
  }
  return { AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY };
}

function isTripPath(storagePath: string, tripId: string) {
  return storagePath.startsWith(`${tripId}/`) && !storagePath.includes("..");
}

function safeFileName(fileName: string) {
  return Array.from(fileName.replaceAll("/", "_").replaceAll("\\", "_"), (character) =>
    character.charCodeAt(0) < 32 ? "_" : character,
  ).join("");
}

async function getAuthenticatedMember(request: Request, tripId: string) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const token = authHeader.slice("Bearer ".length);
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase server configuration is missing.");

  const authClient = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Unauthorized");

  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: member, error: memberError } = await userClient
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (memberError || !member) throw new Error("You do not have access to this trip.");

  return userClient;
}

export const Route = createFileRoute("/api/s3-presign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Request body must be valid JSON." }, 400);
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return json({ error: "Invalid request." }, 400);

        try {
          const input = parsed.data;
          const userClient = await getAuthenticatedMember(request, input.tripId);
          const config = getConfig();
          const s3 = new S3Client({
            region: config.AWS_REGION,
            credentials: {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            },
          });

          if (input.action === "upload") {
            if (!allowedContentTypes.has(input.contentType)) {
              return json({ error: "This file type is not allowed." }, 400);
            }
            const storagePath = `${input.tripId}/${crypto.randomUUID()}/${safeFileName(input.fileName)}`;
            const uploadUrl = await getSignedUrl(
              s3,
              new PutObjectCommand({
                Bucket: config.AWS_S3_BUCKET,
                Key: storagePath,
                ContentType: input.contentType,
              }),
              { expiresIn: SIGNED_URL_TTL_SECONDS },
            );
            return json({ uploadUrl, storagePath, expiresIn: SIGNED_URL_TTL_SECONDS });
          }

          if (!isTripPath(input.storagePath, input.tripId)) {
            return json({ error: "Invalid document path." }, 400);
          }

          const { data: document, error: documentError } = await userClient
            .from("documents")
            .select("id")
            .eq("trip_id", input.tripId)
            .eq("storage_path", input.storagePath)
            .maybeSingle();
          if (documentError || !document) return json({ error: "Document not found." }, 404);

          if (input.action === "download") {
            const downloadUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({ Bucket: config.AWS_S3_BUCKET, Key: input.storagePath }),
              { expiresIn: SIGNED_URL_TTL_SECONDS },
            );
            return json({ downloadUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
          }

          await s3.send(
            new DeleteObjectCommand({ Bucket: config.AWS_S3_BUCKET, Key: input.storagePath }),
          );
          return json({ ok: true });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to process document request.";
          const status = message === "Unauthorized" ? 401 : message.includes("access") ? 403 : 500;
          console.error("S3 document request failed:", error);
          return json({ error: message }, status);
        }
      },
    },
  },
});

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

function getConfig() {
  const { AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
  if (!AWS_REGION || !AWS_S3_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      "AWS S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.",
    );
  }
  return { AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY };
}

function isTripPath(storagePath, tripId) {
  return storagePath.startsWith(`${tripId}/`) && !storagePath.includes("..");
}

function safeFileName(fileName) {
  return fileName.replace(/[\\/]/g, "_").replace(/[\u0000-\u001f]/g, "_");
}

async function getAuthenticatedMember(req, tripId) {
  const authHeader = req.headers.authorization;
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

  return { userId: authData.user.id, userClient };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

  try {
    const input = parsed.data;
    const { userClient } = await getAuthenticatedMember(req, input.tripId);
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
        return res.status(400).json({ error: "This file type is not allowed." });
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
      return res.status(200).json({ uploadUrl, storagePath, expiresIn: SIGNED_URL_TTL_SECONDS });
    }

    if (!isTripPath(input.storagePath, input.tripId)) {
      return res.status(400).json({ error: "Invalid document path." });
    }

    // Confirm the requested key belongs to a document in this trip before signing or deleting it.
    const { data: document, error: documentError } = await userClient
      .from("documents")
      .select("id")
      .eq("trip_id", input.tripId)
      .eq("storage_path", input.storagePath)
      .maybeSingle();
    if (documentError || !document) return res.status(404).json({ error: "Document not found." });

    if (input.action === "download") {
      const downloadUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: config.AWS_S3_BUCKET, Key: input.storagePath }),
        { expiresIn: SIGNED_URL_TTL_SECONDS },
      );
      return res.status(200).json({ downloadUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
    }

    await s3.send(
      new DeleteObjectCommand({ Bucket: config.AWS_S3_BUCKET, Key: input.storagePath }),
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process document request.";
    const status = message === "Unauthorized" ? 401 : message.includes("access") ? 403 : 500;
    console.error("S3 document request failed:", error);
    return res.status(status).json({ error: message });
  }
}

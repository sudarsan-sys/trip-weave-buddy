import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useTripDocuments,
  useUploadDocument,
  useDeleteDocument,
  useTripMembers,
} from "@/hooks/use-trip";
import { getDocumentUrl } from "@/hooks/use-trip";
import { Avatar } from "./Avatar";
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  Trash2,
  Download,
  Loader2,
  CloudUpload,
  Files,
  X,
} from "lucide-react";
import type { TripDocument } from "@/lib/types";

/* ============================================================
 * Helpers
 * ============================================================ */

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return FileImage;
  if (contentType.includes("pdf") || contentType.includes("word")) return FileText;
  if (contentType.includes("sheet") || contentType.includes("excel")) return FileSpreadsheet;
  return File;
}

function getFileColor(contentType: string): string {
  if (contentType.startsWith("image/")) return "text-blue-500 bg-blue-50";
  if (contentType.includes("pdf")) return "text-red-500 bg-red-50";
  if (contentType.includes("word")) return "text-indigo-500 bg-indigo-50";
  if (contentType.includes("sheet") || contentType.includes("excel")) return "text-emerald-500 bg-emerald-50";
  return "text-muted-foreground bg-secondary";
}

const ALLOWED_TYPES = [
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
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/* ============================================================
 * DocumentsSection — Upload to Supabase Storage
 * ============================================================ */
export function DocumentsSection({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { data: documents = [], isLoading } = useTripDocuments(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const uploadMutation = useUploadDocument(tripId);
  const deleteMutation = useDeleteDocument(tripId);

  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Drag & Drop handlers ────────────────────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
      return `File type "${file.type || "unknown"}" is not supported.`;
    }
    if (file.size > MAX_SIZE) {
      return `File is too large (${formatFileSize(file.size)}). Max is 50 MB.`;
    }
    return null;
  };

  const uploadFile = (file: File) => {
    setUploadError(null);
    const err = validateFile(file);
    if (err) {
      setUploadError(err);
      return;
    }
    uploadMutation.mutate(file, {
      onError: (error: any) => {
        setUploadError(error?.message || "Upload failed");
      },
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  /* ── Download ────────────────────────────────────────────── */
  const handleDownload = async (doc: TripDocument) => {
    setDownloadingId(doc.id);
    try {
      const url = await getDocumentUrl(doc.storage_path);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  /* ── Delete ──────────────────────────────────────────────── */
  const handleDelete = (doc: TripDocument) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;
    deleteMutation.mutate({ docId: doc.id, storagePath: doc.storage_path });
  };

  /* ── Get uploader name ───────────────────────────────────── */
  const getUploaderName = (userId: string) => {
    const m = members.find((x) => x.user_id === userId);
    return m?.profiles?.display_name || m?.profiles?.username || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card grid place-items-center h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading documents…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Upload Zone ─────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={
          "relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 " +
          (isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]") +
          (uploadMutation.isPending ? " pointer-events-none opacity-60" : "")
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
        />

        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-14 w-14 border-3 border-primary/20 rounded-full" />
              <div className="absolute inset-0 h-14 w-14 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm font-medium text-primary">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className={
                "grid h-14 w-14 place-items-center rounded-2xl transition-colors " +
                (isDragOver ? "bg-primary/10" : "bg-secondary")
              }
            >
              <CloudUpload
                className={
                  "h-7 w-7 transition-colors " +
                  (isDragOver ? "text-primary" : "text-muted-foreground")
                }
              />
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragOver ? "Drop it here!" : "Drag & drop or click to upload"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, images, docs, spreadsheets, ZIP · up to 50 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {uploadError && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <span className="text-sm text-destructive">{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="rounded-md p-1 hover:bg-destructive/10"
          >
            <X className="h-4 w-4 text-destructive" />
          </button>
        </div>
      )}

      {/* ── File List ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10">
              <Files className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">Documents</h3>
              <p className="text-xs text-muted-foreground">
                {documents.length} file{documents.length !== 1 ? "s" : ""} · Tickets, IDs, insurance — one place.
              </p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition flex items-center gap-2"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary mb-4">
              <Files className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No documents yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Upload tickets, boarding passes, or insurance docs
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {documents.map((doc) => {
              const Icon = getFileIcon(doc.content_type);
              const colorCls = getFileColor(doc.content_type);
              const isOwner = doc.uploaded_by === user?.id;

              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition group"
                >
                  {/* File icon */}
                  <div className={"grid h-10 w-10 place-items-center rounded-xl shrink-0 " + colorCls}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{doc.file_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Avatar id={doc.uploaded_by} name={getUploaderName(doc.uploaded_by)} />
                      <span className="text-xs text-muted-foreground">
                        {getUploaderName(doc.uploaded_by)} ·{" "}
                        {new Date(doc.created_at).toLocaleDateString()} ·{" "}
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary transition"
                      title="Download"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

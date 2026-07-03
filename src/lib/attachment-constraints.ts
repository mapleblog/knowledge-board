/** Shared client/server constraints for card attachments (PRD §2 Attachments). */

export const ATTACHMENTS_BUCKET = "attachments";
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

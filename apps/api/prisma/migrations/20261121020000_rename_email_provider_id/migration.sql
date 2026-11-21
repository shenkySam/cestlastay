-- The column holds the email provider's (Resend's) message id.
ALTER TABLE "email_logs" RENAME COLUMN "sendgrid_id" TO "provider_message_id";

-- RenameIndex
ALTER INDEX "email_logs_sendgrid_id_key" RENAME TO "email_logs_provider_message_id_key";

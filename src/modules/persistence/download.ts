import { logger } from "../../shared/logger";

export function download(filename: string, mimeType: string, content: string): void {
  logger.info("download started", { filename, mimeType, bytes: content.length });

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    logger.error("download failed", {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

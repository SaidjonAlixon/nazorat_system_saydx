import html2pdf from "html2pdf.js";

const PDF_OPTIONS = {
  margin: [10, 10, 10, 10] as [number, number, number, number],
  filename: "invoice.pdf",
  image: { type: "jpeg" as const, quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true, letterRendering: true },
  jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  pagebreak: { mode: ["avoid-all", "css", "legacy"] },
};

/**
 * Generates and downloads an invoice PDF from an HTML element.
 * Vercel-compatible: runs entirely in the browser.
 */
export async function generateInvoicePdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const safeFilename = filename.replace(/[^a-zA-Z0-9\-_.]/g, "_");
  const opts = { ...PDF_OPTIONS, filename: safeFilename.endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf` };
  return html2pdf().set(opts).from(element).save();
}

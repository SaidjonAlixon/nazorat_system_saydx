import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_lib";

/**
 * GET /api/invoices/next-number
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const invoiceNumber = await storage.getNextInvoiceNumber();
    return res.json({ invoiceNumber });
  } catch (err) {
    console.error("[api/invoices/next-number]", err);
    return res.status(500).json({ message: "Raqam generatsiya qilishda xato." });
  }
}

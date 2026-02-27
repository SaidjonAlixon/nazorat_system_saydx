/**
 * Vercel serverless uchun umumiy modullar
 */
import { storage } from "./lib/storage";
import { getUsdToUzsRate } from "./lib/currencyRate";

export { storage };

export const toUzs = (t: { amount: string; currency: string | null }, usdToUzs: number) =>
  t.currency === "USD" ? Number(t.amount) * usdToUzs : Number(t.amount);

export async function getCurrency() {
  return getUsdToUzsRate(() => storage.getManualUsdToUzs());
}

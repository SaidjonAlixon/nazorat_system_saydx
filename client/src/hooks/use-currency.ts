import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "s-ubos-display-currency";
const FALLBACK_UZS_PER_USD = 12_500;
const RATE_API = "https://api.frankfurter.dev/latest?from=USD&to=UZS";

export type DisplayCurrency = "UZS" | "USD";

export function useCurrency() {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>(() => {
    if (typeof window === "undefined") return "UZS";
    const saved = localStorage.getItem(STORAGE_KEY) as DisplayCurrency | null;
    return saved === "USD" || saved === "UZS" ? saved : "UZS";
  });
  const [uzsPerUsd, setUzsPerUsd] = useState<number>(FALLBACK_UZS_PER_USD);

  useEffect(() => {
    fetch(RATE_API)
      .then((res) => res.json())
      .then((data: { rates?: { UZS?: number } }) => {
        const rate = data?.rates?.UZS;
        if (typeof rate === "number" && rate > 0) setUzsPerUsd(rate);
      })
      .catch(() => {});
  }, []);

  const setDisplayCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch (_) {}
  }, []);

  /** Summalar API dan hamma vaqt UZS da keladi. Agar displayCurrency USD bo'lsa, konvertatsiya qilamiz. */
  const formatMoney = useCallback(
    (amountUzs: number): string => {
      if (displayCurrency === "USD") {
        const usd = amountUzs / uzsPerUsd;
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(usd);
      }
      return new Intl.NumberFormat("uz-UZ", {
        style: "currency",
        currency: "UZS",
        maximumFractionDigits: 0,
      }).format(amountUzs);
    },
    [displayCurrency, uzsPerUsd]
  );

  /** UZS dan USD ga (son sifatida). */
  const toUsd = useCallback(
    (amountUzs: number): number => amountUzs / uzsPerUsd,
    [uzsPerUsd]
  );

  return { displayCurrency, setDisplayCurrency, formatMoney, uzsPerUsd, toUsd };
}

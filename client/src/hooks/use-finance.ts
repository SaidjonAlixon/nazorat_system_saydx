import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type InsertTransaction = z.infer<typeof api.transactions.create.input>;
type InsertInvoice = z.infer<typeof api.invoices.create.input>;

export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const res = await fetch(api.transactions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create transaction");
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: [api.invoices.list.path],
    queryFn: async () => {
      const res = await fetch(api.invoices.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return api.invoices.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const res = await fetch(api.invoices.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      return api.invoices.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
    },
  });
}

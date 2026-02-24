import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTransactions, useCreateTransaction, useInvoices, useCreateInvoice } from "@/hooks/use-finance";
import { useProjects } from "@/hooks/use-projects";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Plus, FileText, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Finance() {
  const { data: transactions, isLoading: isTransLoading } = useTransactions();
  const { data: invoices, isLoading: isInvoicesLoading } = useInvoices();
  const { data: projects } = useProjects();
  
  const createTrans = useCreateTransaction();
  const createInvoice = useCreateInvoice();
  
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices'>('transactions');
  const [isTransDialogOpen, setIsTransDialogOpen] = useState(false);
  const [isInvDialogOpen, setIsInvDialogOpen] = useState(false);

  if (isTransLoading || isInvoicesLoading) return <AppLayout><LoadingSpinner message="Moliya yuklanmoqda..." /></AppLayout>;

  const handleCreateTrans = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createTrans.mutateAsync({
      projectId: formData.get("projectId") ? Number(formData.get("projectId")) : undefined,
      type: formData.get("type") as string,
      amount: formData.get("amount") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      currency: "UZS"
    });
    setIsTransDialogOpen(false);
  };

  const handleCreateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createInvoice.mutateAsync({
      projectId: Number(formData.get("projectId")),
      invoiceNumber: formData.get("invoiceNumber") as string,
      amount: formData.get("amount") as string,
      dueDate: new Date(formData.get("dueDate") as string),
      currency: "UZS",
      status: "unpaid"
    });
    setIsInvDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Moliya tizimi</h1>
          <p className="text-muted-foreground">Kirim-chiqim va hisob-fakturalarni boshqarish.</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className={`border-white/10 ${activeTab === 'transactions' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
            onClick={() => setActiveTab('transactions')}
          >
            Tranzaksiyalar
          </Button>
          <Button 
            variant="outline" 
            className={`border-white/10 ${activeTab === 'invoices' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
            onClick={() => setActiveTab('invoices')}
          >
            Hisob-fakturalar
          </Button>
        </div>
      </div>

      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isTransDialogOpen} onOpenChange={setIsTransDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-background"><Plus className="w-4 h-4 mr-2"/>Yangi Tranzaksiya</Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10">
                <DialogHeader><DialogTitle className="text-white">Yangi tranzaksiya qo'shish</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateTrans} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-white/70 block mb-1">Turi</label>
                      <select name="type" className="w-full glass-input p-2 rounded-md text-white">
                        <option value="income" className="text-black">Kirim (+)</option>
                        <option value="expense" className="text-black">Chiqim (-)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-white/70 block mb-1">Miqdor (UZS)</label>
                      <Input name="amount" type="number" required className="glass-input text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Toifa</label>
                    <Input name="category" required className="glass-input text-white" placeholder="Masalan: Ish haqi, Server..." />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Loyiha (ixtiyoriy)</label>
                    <select name="projectId" className="w-full glass-input p-2 rounded-md text-white">
                      <option value="" className="text-black">Bog'lanmagan</option>
                      {projects?.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                    </select>
                  </div>
                  <Button type="submit" disabled={createTrans.isPending} className="w-full bg-primary text-background">Saqlash</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 text-sm font-medium text-white/70">Sana</th>
                  <th className="p-4 text-sm font-medium text-white/70">Toifa</th>
                  <th className="p-4 text-sm font-medium text-white/70">Loyiha</th>
                  <th className="p-4 text-sm font-medium text-white/70 text-right">Miqdor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions?.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-sm text-white/80">{format(new Date(t.date), 'dd.MM.yyyy HH:mm')}</td>
                    <td className="p-4 text-sm text-white font-medium">{t.category}</td>
                    <td className="p-4 text-sm text-white/60">{projects?.find(p => p.id === t.projectId)?.name || '-'}</td>
                    <td className="p-4 text-sm font-bold text-right flex items-center justify-end gap-2">
                      {t.type === 'income' ? <ArrowUpRight className="text-emerald-400 w-4 h-4"/> : <ArrowDownRight className="text-destructive w-4 h-4"/>}
                      <span className={t.type === 'income' ? 'text-emerald-400' : 'text-destructive'}>
                        {new Intl.NumberFormat('uz-UZ').format(Number(t.amount))} UZS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isInvDialogOpen} onOpenChange={setIsInvDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-secondary text-white hover:bg-secondary/80"><FileText className="w-4 h-4 mr-2"/>Yangi Faktura</Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10">
                <DialogHeader><DialogTitle className="text-white">Yangi hisob-faktura</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateInvoice} className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Raqami</label>
                    <Input name="invoiceNumber" required className="glass-input text-white" placeholder="INV-2024-001" />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Loyiha</label>
                    <select name="projectId" required className="w-full glass-input p-2 rounded-md text-white">
                      <option value="" className="text-black">Tanlang...</option>
                      {projects?.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-white/70 block mb-1">Miqdor</label>
                      <Input name="amount" type="number" required className="glass-input text-white" />
                    </div>
                    <div>
                      <label className="text-sm text-white/70 block mb-1">To'lov muddati</label>
                      <Input name="dueDate" type="date" required className="glass-input text-white" />
                    </div>
                  </div>
                  <Button type="submit" disabled={createInvoice.isPending} className="w-full bg-secondary text-white">Yaratish</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices?.map(inv => (
              <div key={inv.id} className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-secondary/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-secondary/10 text-secondary"><FileText className="w-6 h-6"/></div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {inv.status === 'paid' ? "To'langan" : "Kutilmoqda"}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{inv.invoiceNumber}</h3>
                <p className="text-sm text-muted-foreground mb-4">{projects?.find(p => p.id === inv.projectId)?.name}</p>
                <div className="text-2xl font-bold text-white mb-6">{new Intl.NumberFormat('uz-UZ').format(Number(inv.amount))} UZS</div>
                
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="text-xs text-muted-foreground">Muddat: {format(new Date(inv.dueDate), 'dd.MM.yyyy')}</div>
                  <Button variant="ghost" size="sm" className="text-secondary hover:text-white hover:bg-secondary/20">
                    <Download className="w-4 h-4 mr-1"/> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

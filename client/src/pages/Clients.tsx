import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Building2, Plus, Mail, Phone, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) return <AppLayout><LoadingSpinner message="Mijozlar yuklanmoqda..." /></AppLayout>;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createClient.mutateAsync({
      name: formData.get("name") as string,
      company: formData.get("company") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
    });
    setIsOpen(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Mijozlar bazasi</h1>
          <p className="text-muted-foreground">Barcha mijozlar va hamkorlar ro'yxati.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/80 text-background font-bold shadow-lg shadow-primary/25 rounded-xl">
              <Plus className="w-5 h-5 mr-2" />
              Yangi Mijoz
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10">
            <DialogHeader><DialogTitle className="text-white">Yangi mijoz qo'shish</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-white/70 block mb-1">Mijoz Ismi</label>
                <Input name="name" required className="glass-input text-white" />
              </div>
              <div>
                <label className="text-sm text-white/70 block mb-1">Kompaniya</label>
                <Input name="company" className="glass-input text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70 block mb-1">Email</label>
                  <Input name="email" type="email" className="glass-input text-white" />
                </div>
                <div>
                  <label className="text-sm text-white/70 block mb-1">Telefon</label>
                  <Input name="phone" className="glass-input text-white" />
                </div>
              </div>
              <Button type="submit" disabled={createClient.isPending} className="w-full bg-primary text-background mt-4">
                Saqlash
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients?.map((client, i) => (
          <motion.div 
            key={client.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden"
          >
            {client.isBlacklisted && <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/20 rotate-45 translate-x-8 -translate-y-8 blur-xl"></div>}
            
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                <Building2 className="w-6 h-6 text-white/70 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{client.name}</h3>
                <p className="text-sm text-primary/80">{client.company || "Yakka tartibdagi"}</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-muted-foreground">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-white/30" />
                  <span className="text-white/80 truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-white/30" />
                  <span className="text-white/80">{client.phone}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-yellow-500" />
                <span className="font-bold text-sm">{client.score} ball</span>
              </div>
              {client.isBlacklisted && <span className="text-xs font-bold text-destructive uppercase px-2 py-1 bg-destructive/10 rounded-md">Qora ro'yxatda</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, ChevronRight, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const createProject = useCreateProject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) return <AppLayout><LoadingSpinner message="Loyihalar yuklanmoqda..." /></AppLayout>;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createProject.mutateAsync({
        name: formData.get("name") as string,
        clientId: Number(formData.get("clientId")),
        type: formData.get("type") as string,
        budget: formData.get("budget") as string,
        currency: "UZS",
        startDate: new Date(formData.get("startDate") as string),
        deadlineDate: new Date(formData.get("deadlineDate") as string),
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'delayed': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      default: return <Clock className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Loyihalar</h1>
          <p className="text-muted-foreground">Barcha loyihalarni boshqarish markazi.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/80 text-background font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 rounded-xl">
              <Plus className="w-5 h-5 mr-2" />
              Yangi Loyiha
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display text-white">Yangi loyiha yaratish</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">Nomi</label>
                <Input name="name" required className="glass-input text-white" placeholder="Masalan: Veb-sayt dizayni" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Mijoz</label>
                  <select name="clientId" required className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="" className="text-black">Tanlang...</option>
                    {clients?.map(c => (
                      <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Turi</label>
                  <select name="type" required className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="web" className="text-black">Veb-sayt</option>
                    <option value="bot" className="text-black">Telegram Bot</option>
                    <option value="design" className="text-black">Dizayn</option>
                    <option value="marketing" className="text-black">Marketing</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">Byudjet (UZS)</label>
                <Input name="budget" type="number" required className="glass-input text-white" placeholder="1000000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Boshlanish sanasi</label>
                  <Input name="startDate" type="date" required className="glass-input text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Muddat</label>
                  <Input name="deadlineDate" type="date" required className="glass-input text-white" />
                </div>
              </div>
              <Button type="submit" disabled={createProject.isPending} className="w-full mt-4 bg-primary hover:bg-primary/90 text-background">
                {createProject.isPending ? "Yaratilmoqda..." : "Saqlash"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects?.map((project, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={project.id}
          >
            <Link href={`/projects/${project.id}`} className="block h-full">
              <div className="glass-panel rounded-2xl p-6 h-full flex flex-col hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,240,255,0.15)] transition-all duration-300 border border-white/5 hover:border-primary/30 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/10 transition-colors">
                      {getStatusIcon(project.status)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{project.name}</h3>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/10 text-white/70 uppercase tracking-wider">
                        {project.type}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors" />
                </div>
                
                <div className="mt-auto space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Jarayon</span>
                      <span className="text-white font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs mb-0.5">Muddat</p>
                      <p className="text-white font-medium">{format(new Date(project.deadlineDate), 'dd.MM.yyyy')}</p>
                    </div>
                    <div className="text-sm text-right">
                      <p className="text-muted-foreground text-xs mb-0.5">Xatar</p>
                      <p className={`font-bold ${project.riskLevel === 'HIGH' ? 'text-destructive' : project.riskLevel === 'MEDIUM' ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {project.riskLevel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
        {projects?.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Briefcase className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Loyihalar yo'q</h3>
            <p className="text-muted-foreground max-w-md">Sizda hozircha hech qanday loyiha mavjud emas. Yangi loyiha yaratish orqali ishingizni boshlang.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

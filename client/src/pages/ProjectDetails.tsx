import { useState } from "react";
import { useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProject, useAnalyzeRisk } from "@/hooks/use-projects";
import { useTasks, useCreateTask, useUpdateTask, useLogTime } from "@/hooks/use-tasks";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { Play, Check, Plus, BrainCircuit, Activity, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ProjectDetails() {
  const params = useParams();
  const projectId = Number(params.id);
  
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { data: tasks, isLoading: isTasksLoading } = useTasks(projectId);
  const analyzeRisk = useAnalyzeRisk(projectId);
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const logTime = useLogTime();
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  if (isProjectLoading || isTasksLoading) {
    return <AppLayout><LoadingSpinner message="Loyiha tafsilotlari yuklanmoqda..." /></AppLayout>;
  }

  if (!project) return <AppLayout><div className="text-white">Loyiha topilmadi.</div></AppLayout>;

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createTask.mutateAsync({
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        priority: formData.get("priority") as string,
        status: "todo",
      });
      setIsTaskDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    await updateTask.mutateAsync({ id: taskId, status: newStatus });
  };

  const handleLogTime = async (taskId: number) => {
    const mins = prompt("Qancha daqiqa sarfladingiz?");
    if (mins && !isNaN(Number(mins))) {
      await logTime.mutateAsync({ taskId, durationMinutes: Number(mins) });
    }
  };

  const columns = [
    { id: "todo", title: "Qilinishi kerak", color: "border-white/20" },
    { id: "in progress", title: "Bajarilmoqda", color: "border-primary/50" },
    { id: "done", title: "Bajarildi", color: "border-emerald-500/50" }
  ];

  return (
    <AppLayout>
      <div className="mb-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">{project.name}</h1>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Boshlandi: {format(new Date(project.startDate), 'dd.MM.yyyy')}</span>
              <span>Muddat: {format(new Date(project.deadlineDate), 'dd.MM.yyyy')}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => analyzeRisk.mutate()} 
              disabled={analyzeRisk.isPending}
              variant="outline"
              className="border-secondary/50 text-secondary hover:bg-secondary/10"
            >
              <BrainCircuit className="w-4 h-4 mr-2" />
              {analyzeRisk.isPending ? "Tahlil qilinmoqda..." : "AI Xatar Tahlili"}
            </Button>
            
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-background">
                  <Plus className="w-4 h-4 mr-2" />
                  Vazifa qo'shish
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Yangi vazifa</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-white/70">Nomi</label>
                    <Input name="title" required className="glass-input text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Tavsif</label>
                    <textarea name="description" className="w-full rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white focus:ring-2 focus:ring-primary/50" rows={3}></textarea>
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Muhimlik</label>
                    <select name="priority" className="w-full rounded-md border border-white/10 bg-black/20 p-2 text-white">
                      <option value="low" className="text-black">Past</option>
                      <option value="medium" className="text-black">O'rta</option>
                      <option value="high" className="text-black">Yuqori</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={createTask.isPending} className="w-full bg-primary text-black">Saqlash</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI Risk Result Panel */}
        {analyzeRisk.data && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-panel border-secondary/50 rounded-xl p-6 bg-secondary/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary/20 rounded-xl"><Activity className="text-secondary w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">AI Tahlil Xulosasi: Xatar darajasi - {analyzeRisk.data.riskLevel}</h3>
                <p className="text-white/80 leading-relaxed">{analyzeRisk.data.recommendation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => {
          const colTasks = tasks?.filter(t => t.status === col.id) || [];
          return (
            <div key={col.id} className="flex flex-col gap-4">
              <div className={`border-b-2 ${col.color} pb-2`}>
                <h3 className="font-display font-semibold text-lg text-white capitalize">{col.title} <span className="text-muted-foreground text-sm font-normal ml-2">({colTasks.length})</span></h3>
              </div>
              
              <div className="space-y-4">
                {colTasks.map(task => (
                  <motion.div layout key={task.id} className="glass-panel p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white group-hover:text-primary transition-colors">{task.title}</h4>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-destructive/20 text-destructive' : 'bg-white/10 text-white/70'}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{task.description}</p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                      <button onClick={() => handleLogTime(task.id)} className="flex items-center text-xs text-white/50 hover:text-primary transition-colors">
                        <Clock className="w-3 h-3 mr-1" />
                        {task.loggedMinutes} min
                      </button>
                      
                      <div className="flex gap-2">
                        {col.id === 'todo' && (
                          <button onClick={() => handleStatusChange(task.id, 'in progress')} className="p-1.5 bg-primary/20 text-primary rounded-md hover:bg-primary hover:text-background transition-colors">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {col.id === 'in progress' && (
                          <button onClick={() => handleStatusChange(task.id, 'done')} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500 hover:text-background transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

import { useDashboardStats } from "@/hooks/use-dashboard";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { Briefcase, CheckCircle, Clock, DollarSign, TrendingUp, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner message="Boshqaruv paneli yuklanmoqda..." />
      </AppLayout>
    );
  }

  if (!stats) return null;

  // Formatting currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(val);
  };

  const statCards = [
    { title: "Jami Daromad", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-green-400", bg: "bg-green-400/10" },
    { title: "Sof Foyda", value: formatCurrency(stats.netProfit), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { title: "Jami Xarajat", value: formatCurrency(stats.totalExpenses), icon: Activity, color: "text-destructive", bg: "bg-destructive/10" },
    { title: "Faol Loyihalar", value: stats.activeProjects.toString(), icon: Briefcase, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Tugallangan", value: stats.completedProjects.toString(), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Kechikkan", value: stats.delayedProjects.toString(), icon: Clock, color: "text-orange-400", bg: "bg-orange-400/10" },
  ];

  // Mock data for charts since API just returns totals
  const revenueData = [
    { name: 'Yan', revenue: stats.totalRevenue * 0.1 },
    { name: 'Fev', revenue: stats.totalRevenue * 0.15 },
    { name: 'Mar', revenue: stats.totalRevenue * 0.2 },
    { name: 'Apr', revenue: stats.totalRevenue * 0.25 },
    { name: 'May', revenue: stats.totalRevenue * 0.3 },
  ];

  const projectStatusData = [
    { name: 'Faol', count: stats.activeProjects, fill: 'hsl(var(--primary))' },
    { name: 'Tugallangan', count: stats.completedProjects, fill: 'hsl(150 80% 50%)' },
    { name: 'Kechikkan', count: stats.delayedProjects, fill: 'hsl(350 80% 60%)' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            Xush kelibsiz, <span className="text-gradient">Boshqaruv paneliga</span>
          </h1>
          <p className="text-muted-foreground text-lg">Biznesingizning so'nggi holati bilan tanishing.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, i) => (
            <motion.div 
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel rounded-2xl p-6 hover-glow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground font-medium mb-1">{stat.title}</p>
                  <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Revenue Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-panel rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-white mb-6">Daromadlar dinamikasi</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tick={{fill: 'rgba(255,255,255,0.4)'}} tickFormatter={(val) => `${val / 1000000}M`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Project Status Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="glass-panel rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-white mb-6">Loyihalar holati</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectStatusData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.8)'}} width={90} />
                  <RechartsTooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={30}>
                    {projectStatusData.map((entry, index) => (
                      <cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}

import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Wallet, 
  Settings,
  LogOut,
  Hexagon,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Boshqaruv paneli", path: "/", icon: LayoutDashboard },
    { name: "Loyihalar", path: "/projects", icon: Briefcase },
    { name: "Mijozlar", path: "/clients", icon: Users },
    { name: "Moliya", path: "/finance", icon: Wallet },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-2xl border-r border-white/5">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
          <Hexagon className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight text-white leading-none">S-UBOS</h1>
          <p className="text-[10px] text-primary/80 font-medium uppercase tracking-wider">Premium OS</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className="block">
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
                }
              `}>
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "opacity-70"}`} />
                <span className="font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={user?.profileImageUrl || ""} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {user?.firstName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Tizimdan chiqish
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-full z-20 relative">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-panel z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Hexagon className="text-primary w-6 h-6" />
          <span className="font-display font-bold text-lg text-white">S-UBOS</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 left-0 bottom-0 w-72 z-50 lg:hidden"
            >
              <SidebarContent />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto pt-16 lg:pt-0 relative z-10">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

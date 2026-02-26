import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import CompletedProjects from "@/pages/CompletedProjects";
import ProjectDetails from "@/pages/ProjectDetails";
import Finance from "@/pages/Finance";
import Invoices from "@/pages/Invoices";
import Clients from "@/pages/Clients";
import Analytics from "@/pages/Analytics";
import Calendar from "@/pages/Calendar";
import Login from "@/pages/Login";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center overflow-hidden">
        <img
          src="/logo.png"
          alt="SAYD.X"
          className="saydx-loading-logo w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-3xl object-contain flex-shrink-0"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Login/parol rejimi (LOCAL_LOGIN): /login sahifasida form
    if (location === "/login") return <Login />;
    // Replit OIDC: /api/login orqali OAuth
    window.location.href = "/api/login";
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/projects" component={Projects}/>
      <Route path="/projects/completed" component={CompletedProjects}/>
      <Route path="/projects/:id" component={ProjectDetails}/>
      <Route path="/finance" component={Finance}/>
      <Route path="/invoices" component={Invoices}/>
      <Route path="/clients" component={Clients}/>
      <Route path="/analytics" component={Analytics}/>
      <Route path="/calendar" component={Calendar}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

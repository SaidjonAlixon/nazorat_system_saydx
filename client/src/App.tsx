import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetails from "@/pages/ProjectDetails";
import Finance from "@/pages/Finance";
import Clients from "@/pages/Clients";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner message="S-UBOS ishga tushirilmoqda..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Note: Replit auth handles the actual /api/login redirect
    // If we land here, we push them to login via window.location
    window.location.href = "/api/login";
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/projects" component={Projects}/>
      <Route path="/projects/:id" component={ProjectDetails}/>
      <Route path="/finance" component={Finance}/>
      <Route path="/clients" component={Clients}/>
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

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Passages from "./pages/Passages";
import BarrierControl from "./pages/BarrierControl";
import MedicalRecords from "./pages/MedicalRecords";
import Settings from "./pages/Settings";
import Blacklist from "./pages/Blacklist";
import NotificationHistory from "./pages/NotificationHistory";
import Integrations from "./pages/Integrations";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/barrier" component={BarrierControl} />
        <Route path="/vehicles" component={Vehicles} />
        <Route path="/blacklist" component={Blacklist} />
        <Route path="/passages" component={Passages} />
        <Route path="/medical" component={MedicalRecords} />
        <Route path="/settings" component={Settings} />
        <Route path="/notifications" component={NotificationHistory} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

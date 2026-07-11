import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogIn, Search, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Assignments from "@/pages/Assignments";
import Analytics from "@/pages/Analytics";
import WeekView from "@/pages/WeekView";
import LectureView from "@/pages/LectureView";
import AssignmentRunner from "@/pages/AssignmentRunner";
import PracticeAssignment from "@/pages/PracticeAssignment";
import Diagnostics from "@/pages/Diagnostics";
import TopicPractice from "@/pages/TopicPractice";
import Reasoning from "@/pages/Reasoning";
import ReasoningRunner from "@/pages/ReasoningRunner";
import Grades from "@/pages/Grades";
import AdminMode from "@/pages/AdminMode";
import Administrative from "@/pages/Administrative";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/assignments/:id/practice" component={PracticeAssignment} />
      <Route path="/assignments/:id" component={AssignmentRunner} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/reasoning" component={Reasoning} />
      <Route path="/reasoning/:id" component={ReasoningRunner} />
      <Route path="/grades" component={Grades} />
      <Route path="/admin" component={AdminMode} />
      <Route path="/administrative" component={Administrative} />
      <Route path="/diagnostics" component={Diagnostics} />
      <Route path="/weeks/:weekNumber" component={WeekView} />
      <Route path="/lectures/:lectureId" component={LectureView} />
      <Route path="/practice/topic/:topicId" component={TopicPractice} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SignInRequired() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md border border-border rounded-xl bg-card p-8 text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Search className="w-5 h-5" />
          </div>
          <span className="font-serif font-semibold text-xl tracking-tight">
            Basic Evolutionary Psychology
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          This course requires a Google account. Sign in to continue.
        </p>
        <a
          href={`${basePath}/api/auth/google`}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md font-medium bg-primary text-primary-foreground hover:opacity-90"
          data-testid="link-sign-in-google-gate"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: auth, isLoading, isError } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !auth?.authenticated) {
    return <SignInRequired />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthGate>
            <Router />
          </AuthGate>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;

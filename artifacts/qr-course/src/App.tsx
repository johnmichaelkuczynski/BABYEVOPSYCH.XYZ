import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { AuthGate } from "@/components/AuthGate";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

// Unique, descriptive <title> per route (SEO + usability).
const TITLES: Array<[RegExp, string]> = [
  [/^\/$/, "Basic Evolutionary Psychology — Free AI-Taught Online Course"],
  [/^\/dashboard/, "Course Dashboard — Basic Evolutionary Psychology"],
  [/^\/assignments/, "Homework, Unit Test & Final Exam — Basic Evolutionary Psychology"],
  [/^\/reasoning/, "Reasoning Assessments — Basic Evolutionary Psychology"],
  [/^\/grades/, "Grades — Basic Evolutionary Psychology"],
  [/^\/analytics/, "Progress Analytics — Basic Evolutionary Psychology"],
  [/^\/weeks\//, "Course Unit — Basic Evolutionary Psychology"],
  [/^\/lectures\//, "Lecture — Basic Evolutionary Psychology"],
  [/^\/practice\//, "Adaptive Practice — Basic Evolutionary Psychology"],
  [/^\/administrative/, "Administrative — Basic Evolutionary Psychology"],
];

function TitleUpdater() {
  const [location] = useLocation();
  useEffect(() => {
    const hit = TITLES.find(([re]) => re.test(location));
    document.title = hit
      ? hit[1]
      : "Basic Evolutionary Psychology — Free AI-Taught Online Course";
  }, [location]);
  return null;
}

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

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TitleUpdater />
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

import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import SubjectPage from '@/pages/subject';
import LessonPage from '@/pages/lesson';
import QuizSetupPage from '@/pages/quiz-setup';
import QuizSessionPage from '@/pages/quiz-session';
import ResultsPage from '@/pages/results';
import ReviewPage from '@/pages/review';
import LabsPage from '@/pages/labs';
import { Shell } from '@/components/shell';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/subjects/:subjectId/lessons/:lessonId" component={LessonPage} />
          <Route path="/subjects/:subjectId" component={SubjectPage} />
          <Route path="/quiz/setup" component={QuizSetupPage} />
          <Route path="/quiz/:sessionId" component={QuizSessionPage} />
          <Route path="/results/:sessionId" component={ResultsPage} />
          <Route path="/review" component={ReviewPage} />
          <Route path="/labs" component={LabsPage} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

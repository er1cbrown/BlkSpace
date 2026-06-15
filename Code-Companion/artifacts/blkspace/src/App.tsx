import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/landing";
import WelcomePage from "@/pages/welcome";
import FeedPage from "@/pages/feed";
import PostPage from "@/pages/post";
import ProfilePage from "@/pages/profile";
import RelaysPage from "@/pages/relays";
import ArchitecturePage from "@/pages/architecture";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import RecoverPage from "@/pages/recover";
import SettingsPage from "@/pages/settings";
import NotificationsPage from "@/pages/notifications";
import CommunitiesPage from "@/pages/communities";
import CommunityPage from "@/pages/community";
import SearchPage from "@/pages/search";
import WalletPage from "@/pages/wallet";
import MediaPage from "@/pages/media";
import MeshTestPage from "@/pages/mesh-test";
import { isFirstRun } from "@/lib/auth";

const queryClient = new QueryClient();

function Router() {
  const firstRun = isFirstRun();
  return (
    <Switch>
      <Route path="/" component={firstRun ? WelcomePage : LandingPage} />
      <Route path="/welcome" component={WelcomePage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/posts/:id" component={PostPage} />
      <Route path="/profile/:handle" component={ProfilePage} />
      <Route path="/relays" component={RelaysPage} />
      <Route path="/architecture" component={ArchitecturePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/recover" component={RecoverPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/communities" component={CommunitiesPage} />
      <Route path="/communities/:id" component={CommunityPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/media" component={MediaPage} />
      <Route path="/mesh-test" component={MeshTestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
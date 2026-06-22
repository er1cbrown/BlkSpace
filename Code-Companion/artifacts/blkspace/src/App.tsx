import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/landing";
import WelcomePage from "@/pages/welcome";
import { isFirstRun } from "@/lib/auth";
import { OfflineSyncProvider } from "@/lib/offline-sync";
import { GuestModeProvider, useGuestMode } from "@/lib/guest-mode";
import { GuestCTA } from "@/components/social/GuestCTA";
import React from "react";

// Lazy load non-initial pages so a bad import/module in one of them
// doesn't break the initial landing/welcome render (common cause of blank "no display").
const FeedPage = React.lazy(() => import("@/pages/feed"));
const PostPage = React.lazy(() => import("@/pages/post"));
const ProfilePage = React.lazy(() => import("@/pages/profile"));
const RelaysPage = React.lazy(() => import("@/pages/relays"));
const ArchitecturePage = React.lazy(() => import("@/pages/architecture"));
const LoginPage = React.lazy(() => import("@/pages/login"));
const SignupPage = React.lazy(() => import("@/pages/signup"));
const RecoverPage = React.lazy(() => import("@/pages/recover"));
const SettingsPage = React.lazy(() => import("@/pages/settings"));
const NotificationsPage = React.lazy(() => import("@/pages/notifications"));
const CommunitiesPage = React.lazy(() => import("@/pages/communities"));
const CommunityPage = React.lazy(() => import("@/pages/community"));
const SearchPage = React.lazy(() => import("@/pages/search"));
const WalletPage = React.lazy(() => import("@/pages/wallet"));
const MediaPage = React.lazy(() => import("@/pages/media"));
const CreatePage = React.lazy(() => import("@/pages/create"));
const LeaderboardPage = React.lazy(() => import("@/pages/leaderboard"));
const MeshTestPage = React.lazy(() => import("@/pages/mesh-test"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Tauri App ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 20,
            background: "#fee",
            color: "#900",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            height: "100vh",
            overflow: "auto",
          }}
        >
          <h1 style={{ color: "#c00" }}>App crashed (white screen fix)</h1>
          <p>Open DevTools (right-click → Inspect) for full stack.</p>
          <pre>{this.state.error?.stack || this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const firstRun = isFirstRun();
  return (
    <React.Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", opacity: 0.7 }}>
          Loading page...
        </div>
      }
    >
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
        <Route path="/settings" component={() => <GuestRoute component={SettingsPage} />} />
        <Route path="/recover" component={RecoverPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/communities" component={CommunitiesPage} />
        <Route path="/communities/:id" component={CommunityPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/wallet" component={() => <GuestRoute component={WalletPage} />} />
        <Route path="/create" component={() => <GuestRoute component={CreatePage} />} />
        <Route path="/leaderboard" component={LeaderboardPage} />
        <Route path="/media" component={MediaPage} />
        <Route path="/mesh-test" component={() => <GuestRoute component={MeshTestPage} />} />
        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
}

/** Route wrapper that shows a "Create free account" prompt to guests. */
function GuestRoute({ component: Comp }: { component: React.ComponentType }) {
  const { isGuest } = useGuestMode();
  if (isGuest) return <GuestCTA fullPage />;
  return <Comp />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <OfflineSyncProvider>
            <GuestModeProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </GuestModeProvider>
          </OfflineSyncProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

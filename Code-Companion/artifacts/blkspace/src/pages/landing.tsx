import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Users,
  BookOpen,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { enterGuestMode } from "@/lib/auth";

export default function LandingPage() {
  const [, navigate] = useLocation();

  const browseYard = () => {
    enterGuestMode();
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />
      <main className="flex-1">
        <section className="relative pt-28 pb-16 md:pt-40 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,var(--color-primary),transparent_50%)] opacity-10"></div>
          <div className="container relative z-10 mx-auto px-4 text-center">
            <p className="text-sm font-medium text-primary mb-4">
              The yard comes first
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
              A page for your campus
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4 font-medium">
              Read the wall, open someone’s page, and see the yard before you
              make an account.
            </p>
            <p className="text-sm text-muted-foreground/80 max-w-2xl mx-auto mb-10">
              {BRAND.name} is the campus app at bkspc.app, for schools across
              the country, not one state. Posts, profiles, clubs, and notices
              come first. The coins are listed below, in the open.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="text-lg px-10 rounded-full h-14 font-bold shadow-lg"
                onClick={browseYard}
              >
                Browse the yard <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Link href="/welcome">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 rounded-full h-14 font-bold"
                >
                  Make a page
                </Button>
              </Link>
              <Link href="/faculty">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full h-14 font-bold"
                >
                  Faculty desk
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-primary/20">
            <img
              src="/images/hero-yard.webp"
              alt="Campus yard"
              className="w-full h-[320px] md:h-[520px] object-cover"
            />
          </div>
        </section>

        <section className="py-20 bg-card border-y">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4">
              What you get
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Same campus, three ways in. Nobody has to understand a coin to
              use the yard.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-background p-6 rounded-2xl border">
                <Users className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Guest</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Walk the campus wall and open profiles. No password. Posting,
                  messages, and the wallet wait until you make a page.
                </p>
                <Button variant="link" className="px-0" onClick={browseYard}>
                  Open the wall
                </Button>
              </div>
              <div className="bg-background p-6 rounded-2xl border">
                <BookOpen className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Student</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A page with your name on it, a yard to post in, clubs, and
                  ProjectConnect when you want a campus job or an org. Practice
                  credits can be tipped or spent in the shop. They are not a
                  paycheck.
                </p>
                <Link href="/welcome" className="text-sm text-primary font-medium">
                  Join a yard
                </Link>
              </div>
              <div className="bg-background p-6 rounded-2xl border">
                <GraduationCap className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Faculty</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The faculty desk is for notices and the people you already
                  teach. You are not asked to trade, stake, or cash anything
                  out.
                </p>
                <Link href="/faculty" className="text-sm text-primary font-medium">
                  Open the desk
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4">
              Places on the yard
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              These are the pages. Each one is a different reason to be here.
            </p>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Link href="/connect" className="bg-card p-6 rounded-2xl border block">
                <Briefcase className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">ProjectConnect</h3>
                <p className="text-sm text-muted-foreground">
                  Campus jobs, orgs, and a way to raise your hand. A student
                  uses it to find work. An office uses it to post the work.
                </p>
              </Link>
              <Link href="/clinyard" className="bg-card p-6 rounded-2xl border block">
                <HeartPulse className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">ClinYard</h3>
                <p className="text-sm text-muted-foreground">
                  The study desk for clinic and med students. The drill set is
                  still being built, so the page tells you that instead of
                  pretending the cases are ready.
                </p>
              </Link>
              <Link href="/communities" className="bg-card p-6 rounded-2xl border block">
                <Users className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Clubs</h3>
                <p className="text-sm text-muted-foreground">
                  A school channel for the org you already belong to. The wall
                  is the campus. The club is your people.
                </p>
              </Link>
              <div className="bg-card p-6 rounded-2xl border">
                <BookOpen className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Your page</h3>
                <p className="text-sm text-muted-foreground">
                  A profile is the MySpace part: your name, your yard, and what
                  you posted. Guests can look. You customize it after you join.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-card border-y">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4">
              BK markets
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The mark is BK, same as the logo and bkspc.app. A guest can read
              this with no account. There is no hidden coin and no secret sale.
              A student does not reach a coin until Yard Cred says they have
              learned how these tokens work.
            </p>
            <ul className="text-sm text-muted-foreground space-y-3 mb-8 text-left">
              <li>
                <strong className="text-foreground">WeixBucks</strong> are
                practice credits on the yard. Tip and shop. They are not cash,
                not a paycheck, and not a coin you can buy.
              </li>
              <li>
                <strong className="text-foreground">BKSPC</strong> is the only
                cash-out of those credits, at 1,000 to 1, and only after a
                funded mint. That mint is not live. Under 1,000 is rejected.
              </li>
              <li>
                <strong className="text-foreground">BI9</strong> is a separate
                coin on HyperEVM. It is not paid from WeixBucks. Its mint is
                not issuing.
              </li>
              <li>
                The finance desk is a later screen for reading prices and
                balances. It is not a buy button, not open on the campus wall,
                and not required to use the yard. Finance, econ, accounting,
                and business students get the same gate as everyone else:
                practice credits first, then the lesson, then a coin. The app
                will not move a student’s credits into a new coin, including
                one that is not BKSPC or BI9.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Next for a guest is still the wall. Next for a student is a page,
              a club, or ProjectConnect. Next for faculty is the desk. The
              markets are disclosed here so the yard and the coins are both
              visible before anyone joins.
            </p>
            <div className="flex justify-center">
              <Button className="rounded-full" onClick={browseYard}>
                Browse the yard as a guest
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card py-12 border-t text-center text-muted-foreground">
        <p className="font-bold text-xl mb-4 text-foreground tracking-tight">
          {BRAND.name}
        </p>
        <p className="text-sm">A campus yard. Browse first.</p>
      </footer>
    </div>
  );
}

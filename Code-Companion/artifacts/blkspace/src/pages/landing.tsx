import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight,
  Network,
  Shield,
  Coins,
  Globe,
  Users,
  Zap,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Vote,
  Music,
  Store,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,var(--color-primary),transparent_50%)] opacity-10"></div>
          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-4 text-foreground">
                {BRAND.name}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-2 font-medium">
                {BRAND.tagline}
              </p>
              <p className="text-sm text-muted-foreground/70 max-w-2xl mx-auto mb-10">
                Scroll for free. Earn WeixBucks. Cash out to {BRAND.symbol} on
                Solana. Your account, your content, your earnings.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/feed">
                  <Button
                    size="lg"
                    className="text-lg px-8 rounded-full h-14 font-bold shadow-lg"
                  >
                    Enter the Yard <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/welcome">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 rounded-full h-14 font-bold"
                  >
                    Create free account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* VISUAL BREAK */}
        <section className="container mx-auto px-4 pb-24">
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-primary/20 animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <img
              src="/images/hero-yard.png"
              alt="Vibrant college campus yard"
              className="w-full h-[400px] md:h-[600px] object-cover"
            />
          </div>
        </section>

        {/* MISSION */}
        <section className="py-24 bg-card border-y">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                TikTok meets MySpace. <br />
                With a paycheck.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Post on your yard, customize your profile, sell your art, and
                earn WeixBucks for every contribution. No corporation owns your
                account — and nobody can delete your content.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-16">
              Why students switch
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <Coins className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-4">Get paid to post</h3>
                <p className="text-muted-foreground">
                  Earn WeixBucks for posts, uploads, and yard activity. TikTok
                  keeps 50–70%. {BRAND.name} keeps 85% with you.
                </p>
              </div>
              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <Shield className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-4">Your content stays</h3>
                <p className="text-muted-foreground">
                  No platform can take your posts down. Your account belongs to
                  you — not a corporation.
                </p>
              </div>
              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <Globe className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-4">Your community, your feed</h3>
                <p className="text-muted-foreground">
                  Join a yard — campus, creator crew, or local scene. Culture-first,
                  not algorithm-first.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MESH NETWORK VISUAL */}
        <section className="py-24 bg-secondary text-secondary-foreground">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                  Our Infrastructure, Our Rules.
                </h2>
                <p className="text-lg opacity-90 mb-8">
                  {BRAND.name} runs on community-operated relays. When you host a
                  node, you strengthen the network for everyone in your yard.
                </p>
                <Link href="/relays">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-background text-foreground hover:bg-background/90 rounded-full"
                  >
                    View Network Status <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/images/mesh-network.png"
                  alt="Decentralized relay network"
                  className="w-full h-[400px] object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ECONOMY SECTION */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex justify-center mb-8">
              <img
                src="/images/weixbucks-coin.png"
                alt="WeixBucks Coin"
                className="w-32 h-32 animate-bounce"
                style={{ animationDuration: "3s" }}
              />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              The WeixBucks Economy
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Value generated by the community should stay in the community.
              Earn WeixBucks by running relays, creating viral content, and
              contributing to the network's health.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-12 text-left">
              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold mb-2">Run a Relay</h4>
                  <p className="text-sm text-muted-foreground">
                    Host infrastructure and earn block rewards.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold mb-2">Create Value</h4>
                  <p className="text-sm text-muted-foreground">
                    High-engagement posts mint new tokens.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold mb-2">Tip Creators</h4>
                  <p className="text-sm text-muted-foreground">
                    Directly support your favorite yard voices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES — STUDENTS + CREATORS */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4">
              For everyone on the yard
            </h2>
            <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
              Whether you're a freshman scrolling between classes or a founder
              recruiting talent, {BRAND.name} has a path for you.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <Users className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Students</h3>
                <p className="text-sm text-muted-foreground">
                  Post, upload, join your yard. Earn WeixBucks from every
                  action. Customize your profile MySpace-style. Cash out when
                  you&apos;re ready.
                </p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <Music className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Creators</h3>
                <p className="text-sm text-muted-foreground">
                  Sell mixes, videos, and art in the marketplace. Mint NFT
                  tickets. Keep 85% of every sale. Build a subscriber-only
                  yard with BKSPC gating.
                </p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <GraduationCap className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Alumni & Faculty</h3>
                <p className="text-sm text-muted-foreground">
                  Mentor students from your yard. Sponsor events. Post jobs.
                  Get a verified alumni badge. Governance votes on yard rules.
                </p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <Briefcase className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Professionals</h3>
                <p className="text-sm text-muted-foreground">
                  Build a pro profile + portfolio. Recruit from campus yards.
                  Post job listings to targeted communities. Verified badge with{" "}
                  {BRAND.symbol}.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ECONOMY FLOW */}
        <section className="py-24 bg-card border-y">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4">
              How the economy works
            </h2>
            <p className="text-center text-muted-foreground mb-12">
              Three layers. Simple for users. Powerful for the community.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 rounded-2xl border border-primary/20 bg-primary/5">
                <Coins className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold mb-2">WeixBucks (WB)</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Off-chain credits. Earn from posts, uploads, yard
                  participation. Capped at 250/day.
                </p>
                <p className="text-xs text-muted-foreground">
                  Never purchasable. Never a security.
                </p>
              </div>
              <div className="text-center p-6 rounded-2xl border border-accent/20 bg-accent/5">
                <Zap className="w-10 h-10 text-accent mx-auto mb-4" />
                <h3 className="font-bold mb-2">Karma</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Reputation score from community engagement. Affects feed
                  ranking and withdrawal eligibility.
                </p>
                <p className="text-xs text-muted-foreground">
                  Never spendable. Earned, not bought.
                </p>
              </div>
              <div className="text-center p-6 rounded-2xl border border-secondary/20 bg-secondary/5">
                <TrendingUp className="w-10 h-10 text-secondary-foreground mx-auto mb-4" />
                <h3 className="font-bold mb-2">{BRAND.symbol} (Solana)</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  On-chain token. Mint from earned WB (1,000:1). Use for
                  events, NFTs, governance, premium yards.
                </p>
                <p className="text-xs text-muted-foreground">
                  Fair launch. Burn deflation. Utility-driven.
                </p>
              </div>
            </div>
            <div className="mt-8 p-4 rounded-xl bg-muted/50 text-center text-sm text-muted-foreground">
              <strong className="text-foreground">The flow:</strong> Post →
              earn WB → spend in marketplace or withdraw to BKSPC → sell on
              DEX or spend on premium features. A % of every BKSPC transaction
              is burned — supply shrinks as the yard grows.
            </div>
          </div>
        </section>

        {/* FOR INVESTORS */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4">
              For investors & reviewers
            </h2>
            <p className="text-center text-muted-foreground mb-12">
              {BRAND.symbol} is a utility token, not a security. Here&apos;s the
              thesis.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <TrendingUp className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Growth thesis</h3>
                <p className="text-sm text-muted-foreground">
                  Campus yards, creator communities, and tight-knit groups —
                  millions of users who post daily elsewhere. As adoption grows,{" "}
                  {BRAND.symbol} utility demand increases. Burn shrinks supply.
                </p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <Vote className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Utility drives value</h3>
                <p className="text-sm text-muted-foreground">
                  BKSPC is spent on events, NFT tickets, marketplace listings,
                  boosted posts, job posts, verified badges, governance, and
                  exclusive yards. Real demand, not speculation.
                </p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <Shield className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Fair & defensible</h3>
                <p className="text-sm text-muted-foreground">
                  No presale. No insider allocation. Earn-only WB. Eligibility
                  gates prevent farming. Published fees. Treasury multisig +
                  timelock. Hard cap with mint authority revocation.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href={BRAND.githubRepo} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="rounded-full">
                  View code & CI proof <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
              <Link href="/architecture">
                <Button size="lg" variant="outline" className="rounded-full">
                  Read the architecture <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/feed">
                <Button size="lg" className="rounded-full">
                  Try the app <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-6xl font-black mb-8">
              Ready to step on the yard?
            </h2>
            <Link href="/feed">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-12 py-6 rounded-full font-bold shadow-xl"
              >
                Open {BRAND.name}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-card py-12 border-t text-center text-muted-foreground">
        <p className="font-bold text-xl mb-4 text-foreground tracking-tight">
          {BRAND.name}
        </p>
        <p className="text-sm">
          {BRAND.tagline} · {BRAND.siteUrl.replace("https://", "")}
        </p>
      </footer>
    </div>
  );
}

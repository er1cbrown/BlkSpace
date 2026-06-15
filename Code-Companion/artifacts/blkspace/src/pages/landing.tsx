import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Network, Shield, Coins, Globe, Users, Zap } from "lucide-react";

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
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 text-foreground font-serif">
                The Digital <span className="text-primary italic">Yard.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-2 font-sans font-medium">
                A federated social platform for HBCU college-town communities.
              </p>
              <p className="text-sm text-muted-foreground/60 max-w-2xl mx-auto mb-10 font-mono tracking-wide">
                B.L.A.C.K. // WeixNet — decentralized, community-owned, economically sovereign
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/feed">
                  <Button size="lg" className="text-lg px-8 rounded-full h-14 font-bold shadow-lg">
                    Join the Yard <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/architecture">
                  <Button size="lg" variant="outline" className="text-lg px-8 rounded-full h-14 font-bold">
                    Read the Whitepaper
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* VISUAL BREAK */}
        <section className="container mx-auto px-4 pb-24">
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-primary/20 animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <img src="/images/hero-yard.png" alt="Vibrant college campus yard" className="w-full h-[400px] md:h-[600px] object-cover" />
          </div>
        </section>

        {/* MISSION */}
        <section className="py-24 bg-card border-y">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Not just a social network. <br/>A sovereign community.</h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                BlkSpace gives the power back to the people. No corporate algorithms deciding what you see. No mining your data for ad revenue. Just pure, unfiltered community connection built on decentralized infrastructure.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-16">The Architecture of Independence</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <Network className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-4">Federated Nodes</h3>
                <p className="text-muted-foreground">Hosted by students, alumni, and local businesses. The network survives because we all chip in. No central server to shut down.</p>
              </div>
              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <Shield className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-4">Cryptographic Identity</h3>
                <p className="text-muted-foreground">Your handle and data belong to you. Portable across the entire mesh network. Nobody can take your voice away.</p>
              </div>
              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <Globe className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-4">Town-Centric Design</h3>
                <p className="text-muted-foreground">Feeds designed around physical proximity and shared culture. The digital twin to your physical campus yard.</p>
              </div>
            </div>
          </div>
        </section>

        {/* MESH NETWORK VISUAL */}
        <section className="py-24 bg-secondary text-secondary-foreground">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Our Infrastructure, Our Rules.</h2>
                <p className="text-lg opacity-90 mb-8">
                  BlkSpace runs on a mesh network of community-operated relays. When you run a node, you strengthen the network for everyone in your town.
                </p>
                <Link href="/relays">
                  <Button variant="secondary" size="lg" className="bg-background text-foreground hover:bg-background/90 rounded-full">
                    View Network Status <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img src="/images/mesh-network.png" alt="Mesh Network Nodes" className="w-full h-[400px] object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* ECONOMY SECTION */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex justify-center mb-8">
              <img src="/images/weixbucks-coin.png" alt="WeixBucks Coin" className="w-32 h-32 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">The WeixBucks Economy</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Value generated by the community should stay in the community. Earn WeixBucks by running relays, creating viral content, and contributing to the network's health.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-12 text-left">
              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit"><Zap className="w-6 h-6 text-primary" /></div>
                <div>
                  <h4 className="font-bold mb-2">Run a Relay</h4>
                  <p className="text-sm text-muted-foreground">Host infrastructure and earn block rewards.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit"><Users className="w-6 h-6 text-primary" /></div>
                <div>
                  <h4 className="font-bold mb-2">Create Value</h4>
                  <p className="text-sm text-muted-foreground">High-engagement posts mint new tokens.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit"><Coins className="w-6 h-6 text-primary" /></div>
                <div>
                  <h4 className="font-bold mb-2">Tip Creators</h4>
                  <p className="text-sm text-muted-foreground">Directly support your favorite yard voices.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-6xl font-black mb-8">Ready to step on the yard?</h2>
            <Link href="/feed">
              <Button size="lg" variant="secondary" className="text-lg px-12 py-6 rounded-full font-bold shadow-xl">
                Enter BlkSpace
              </Button>
            </Link>
          </div>
        </section>
      </main>
      
      <footer className="bg-card py-12 border-t text-center text-muted-foreground">
        <p className="font-serif font-bold text-xl mb-4 text-foreground">BlkSpace</p>
        <p className="text-sm">Built by the community. Owned by the community.</p>
      </footer>
    </div>
  );
}
import { Navbar } from "@/components/layout/Navbar";
import { useGetArchitecture } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Shield, Zap, Lock } from "lucide-react";

export default function ArchitecturePage() {
  const { data: arch, isLoading } = useGetArchitecture();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      
      <div className="bg-secondary text-secondary-foreground py-16 border-b-4 border-accent">
        <div className="container px-4 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">Architecture</h1>
          <p className="text-lg opacity-90">
            A look under the hood of BlkSpace. Designed for resilience, sovereignty, and community ownership.
          </p>
        </div>
      </div>

      <main className="flex-1 container py-12 px-4 max-w-5xl">
        {isLoading ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-64 bg-muted/50 rounded-2xl"></div>
            <div className="h-64 bg-muted/50 rounded-2xl"></div>
          </div>
        ) : arch ? (
          <div className="space-y-16">
            
            {/* DESIGN PRINCIPLES */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <Zap className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Design Principles</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {Array.isArray(arch.principles) && arch.principles.map((principle, i) => (
                  <Card key={i} className="border-muted shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">{principle.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{principle.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* THE STACK */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <Layers className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">The Protocol Stack</h2>
              </div>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {Array.isArray(arch.layers) && arch.layers.map((layer, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <span className="text-primary-foreground font-bold text-sm">{i+1}</span>
                    </div>
                    <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] shadow-md border-t-4 transition-transform hover:-translate-y-1" style={{ borderTopColor: layer.color || 'var(--primary)' }}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="uppercase tracking-wider" style={{ backgroundColor: layer.color || 'var(--primary)' }}>{layer.layer}</Badge>
                          <span className="text-xs text-muted-foreground font-medium">{layer.standardRole}</span>
                        </div>
                        <CardTitle className="text-lg">{layer.blkspaceImpl}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{layer.rationale}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </section>

            {/* SECURITY */}
            <section className="bg-card rounded-3xl p-8 border shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <Shield className="w-8 h-8 text-destructive" />
                <h2 className="text-3xl font-bold">Security Model</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="uppercase tracking-wider border-b-2 font-bold bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-xl">Layer</th>
                      <th className="px-6 py-4">Mechanism</th>
                      <th className="px-6 py-4 rounded-tr-xl">Protection Against</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.isArray(arch.securityLayers) && arch.securityLayers.map((sec, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-semibold">{sec.layer}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-primary" /> {sec.mechanism}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{sec.protection}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground border rounded-2xl border-dashed">Architecture data unavailable.</div>
        )}
      </main>
    </div>
  );
}
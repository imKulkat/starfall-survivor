import { Link } from "react-router-dom";
import { Gamepad2, Zap, Sparkles, Target, Trophy, ChevronRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background bg-grid relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
      
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 glow-primary">
            <Gamepad2 className="w-6 h-6 text-primary" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">SURVIVOR</span>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-6">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">Auto-Shooter Roguelike</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-black mb-6">
            <span className="text-glow-primary text-primary">SURVIVOR</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Battle endless waves of enemies, collect powerful weapons, and become the ultimate survivor.
          </p>

          <Link
            to="/game"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-lg gradient-primary text-primary-foreground font-display font-bold text-lg glow-primary hover:scale-105 transition-transform"
          >
            <Gamepad2 className="w-5 h-5" />
            Play Now
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-16">
          <Link to="/game?mode=futuristic" className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all">
            <Zap className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-display text-xl font-bold text-foreground mb-2">Futuristic Mode</h3>
            <p className="text-muted-foreground text-sm">Plasma rifles, railguns, homing missiles</p>
          </Link>

          <Link to="/game?mode=magic" className="group p-6 rounded-2xl bg-card border border-border hover:border-secondary/50 transition-all">
            <Sparkles className="w-8 h-8 text-secondary mb-4" />
            <h3 className="font-display text-xl font-bold text-foreground mb-2">Magic Mode</h3>
            <p className="text-muted-foreground text-sm">Fireballs, chain lightning, meteor strikes</p>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-16">
          {[
            { icon: Target, title: "60+ Weapons" },
            { icon: Zap, title: "20+ Enemies" },
            { icon: Trophy, title: "Infinite Scaling" },
            { icon: Sparkles, title: "Legendary Items" },
          ].map((f, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border text-center">
              <f.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-sm font-bold text-foreground">{f.title}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;

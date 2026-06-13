import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, CheckCircle2 } from "lucide-react";
import { MaryAvatar } from "@/components/MaryAvatar";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

const COMMANDS = [
  { id: "daily", label: "Daily Talk", text: "Let's have our daily English conversation." },
  { id: "reading", label: "Reading Talk", text: "Let's do a reading talk session." },
  { id: "review", label: "Review Challenge", text: "Give me a review challenge based on our conversations." },
  { id: "end", label: "End Talk", text: "Let's end today's session. Please give me a summary." },
];

export default function TasksScreen() {
  const { toast } = useToast();
  const [showStartMessage, setShowStartMessage] = useState(false);
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Copied!",
      duration: 2000,
    });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">
        
        <h1 className="text-2xl font-bold text-center text-foreground mb-8" data-testid="text-page-title">
          Tasks
        </h1>
        
        {/* Header Avatar & Message */}
        <div className="flex items-center gap-4 mb-10">
          <MaryAvatar height={140} showEmote={false} className="scale-90 origin-left" />
          
          <motion.div 
            className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-border flex-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <p className="text-sm font-medium text-foreground">
              Can we talk today?
            </p>
          </motion.div>
        </div>
        
        {/* Progress Sections */}
        <div className="space-y-4 mb-10">
          <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
            <span className="font-bold text-foreground">Daily Talk</span>
            <div className="px-3 py-1 bg-secondary text-secondary-foreground font-bold rounded-full text-sm">0 / 1</div>
          </div>
          
          <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
            <span className="font-bold text-foreground">Weekly Streak Bonus</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden" />
              <span className="text-sm font-bold text-muted-foreground">0 / 7</span>
            </div>
          </div>
          
          <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
            <span className="font-bold text-foreground">Reading Talk Tasks</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden" />
              <span className="text-sm font-bold text-muted-foreground">0 / 3</span>
            </div>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex justify-between items-center">
            <span className="font-bold text-primary">Special Tasks</span>
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-5 h-5 fill-primary text-primary-foreground" />
              <span className="text-sm font-bold">3 / 3</span>
            </div>
          </div>
        </div>
        
        {/* Talk Commands */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-foreground mb-4 pl-2 border-l-4 border-primary">Talk Commands</h2>
          <div className="space-y-3">
            {COMMANDS.map((cmd, i) => (
              <motion.div 
                key={cmd.id}
                className="bg-card p-4 rounded-2xl shadow-sm border border-border"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <div className="text-sm font-bold text-muted-foreground mb-2">{cmd.label}</div>
                <div className="flex items-center gap-2">
                  <div className="bg-secondary/50 font-mono text-sm p-3 rounded-xl flex-1 text-foreground border border-border/50 break-words">
                    {cmd.text}
                  </div>
                  <button 
                    onClick={() => handleCopy(cmd.text)}
                    className="p-3 bg-secondary hover:bg-secondary/80 rounded-xl text-secondary-foreground transition-colors active:scale-95 shrink-0"
                    data-testid={`btn-copy-${cmd.id}`}
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Start Talk Action */}
        <div className="pb-8">
          <button 
            onClick={() => setShowStartMessage(true)}
            className="w-full bg-primary hover:bg-primary/90 active:scale-95 transition-all text-center py-4 rounded-3xl shadow-sm border-b-4 border-primary-foreground/20 font-bold text-primary-foreground text-lg mb-4"
            data-testid="btn-start-talk"
          >
            Start Talk
          </button>
          
          {showStartMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              className="bg-accent/20 text-accent-foreground p-4 rounded-2xl border border-accent/30 text-center font-medium text-sm"
              data-testid="msg-start-talk"
            >
              Please open ChatGPT and start with one of the talk commands.
            </motion.div>
          )}
        </div>
        
      </div>
      <BottomNav />
    </div>
  );
}

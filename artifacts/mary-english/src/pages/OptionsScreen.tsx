import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Check } from "lucide-react";
import { MaryAvatar } from "@/components/MaryAvatar";
import { BottomNav } from "@/components/BottomNav";

const OUTFITS = [
  { id: "black", name: "Black Outfit", locked: false, color: "bg-[#2c2c2c]" },
  { id: "level", name: "Level Reward Outfit", locked: true, color: "bg-secondary" },
  { id: "seasonal", name: "Seasonal Outfit", locked: true, color: "bg-accent/40" },
];

export default function OptionsScreen() {
  const [selectedOutfit, setSelectedOutfit] = useState("black");

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col pb-24 items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 pt-8">
        
        <h1 className="text-2xl font-bold text-center text-foreground mb-8" data-testid="text-page-title">
          Options
        </h1>
        
        {/* Avatar Preview */}
        <div className="flex justify-center mb-10">
          <MaryAvatar height={240} showEmote={false} />
        </div>
        
        {/* Wardrobe Section */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 pl-2 border-l-4 border-primary">Wardrobe</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {OUTFITS.map((outfit) => {
              const isSelected = selectedOutfit === outfit.id;
              
              return (
                <motion.div 
                  key={outfit.id}
                  className={`
                    relative rounded-2xl border-2 p-3 flex flex-col items-center gap-3 transition-all
                    ${outfit.locked ? "bg-muted/50 border-transparent opacity-70" : 
                      isSelected ? "bg-card border-primary shadow-sm" : "bg-card border-border shadow-sm cursor-pointer hover:border-primary/50"}
                  `}
                  onClick={() => !outfit.locked && setSelectedOutfit(outfit.id)}
                  whileTap={!outfit.locked ? { scale: 0.96 } : undefined}
                  data-testid={`outfit-card-${outfit.id}`}
                >
                  <div className={`w-16 h-20 rounded-xl ${outfit.color} flex items-center justify-center shadow-inner relative overflow-hidden`}>
                    {outfit.locked && (
                      <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                        <Lock className="w-6 h-6 text-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  <span className={`text-xs font-bold text-center ${outfit.locked ? "text-muted-foreground" : "text-foreground"}`}>
                    {outfit.name}
                  </span>
                  
                  {!outfit.locked && isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
        
      </div>
      <BottomNav />
    </div>
  );
}

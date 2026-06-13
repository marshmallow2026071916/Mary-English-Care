import { motion } from "framer-motion";

interface MaryAvatarProps {
  height?: number;
  className?: string;
  showEmote?: boolean;
}

export function MaryAvatar({ height = 240, className = "", showEmote = true }: MaryAvatarProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <motion.div 
        className="w-48 bg-gradient-to-br from-secondary/80 to-accent/30 rounded-3xl border-2 border-white/50 shadow-sm flex items-center justify-center overflow-hidden relative"
        style={{ height }}
        animate={{ 
          y: [0, -4, 0],
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        data-testid="mary-avatar-box"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        <span className="text-xl italic font-semibold text-primary/80 z-10 relative">Mary</span>
        
        {/* Subtle shimmer effect */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0"
          animate={{
            x: ["-200%", "200%"],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
            delay: 1
          }}
        />
      </motion.div>
      
      {showEmote && (
        <span className="text-xs italic text-muted-foreground" data-testid="text-idle-emote">
          Idle Emote: blink / breathe / gentle smile
        </span>
      )}
    </div>
  );
}

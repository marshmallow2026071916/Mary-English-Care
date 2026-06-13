import { Link, useLocation } from "wouter";
import { Home, CheckSquare, Settings } from "lucide-react";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Options", href: "/options", icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border flex justify-center pb-safe">
      <div className="w-full max-w-[430px] flex justify-around items-center px-4 py-3 relative">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={`flex flex-col items-center justify-center w-16 h-12 relative cursor-pointer ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="bubble"
                    className="absolute inset-0 bg-primary/10 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`w-6 h-6 z-10 ${isActive ? "fill-primary/20" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

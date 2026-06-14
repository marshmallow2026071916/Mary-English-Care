import { Link } from "wouter";
import { Home } from "lucide-react";

export function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border flex justify-center">
      <div className="w-full max-w-[430px] flex justify-center items-center px-4 py-3">
        <Link href="/">
          <div
            className="flex flex-col items-center justify-center gap-0.5 w-16 h-12 text-primary cursor-pointer active:scale-95 transition-transform"
            data-testid="nav-home"
          >
            <Home className="w-6 h-6" strokeWidth={2.5} />
            <span className="text-[11px] font-semibold">Home</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

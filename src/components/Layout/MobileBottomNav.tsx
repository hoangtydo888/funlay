import { Home, Plus, Users, User, Zap, Wallet } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { UploadVideoModal } from "@/components/Video/UploadVideoModal";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useFunWalletSync } from "@/hooks/useFunWalletSync";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { WalletSelectionModal } from "@/components/Web3/WalletSelectionModal";

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string | null;
  isCreate?: boolean;
  isWallet?: boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Zap, label: "Shorts", href: "/shorts" },
  { icon: Plus, label: "Tạo", href: null, isCreate: true },
  { icon: Wallet, label: "Ví", href: null, isWallet: true },
  { icon: User, label: "Bạn", href: "/your-videos" },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { lightTap, mediumTap } = useHapticFeedback();
  
  // Wallet connection states
  const { isLinked: isFunWalletLinked } = useFunWalletSync();
  const { isConnected: isWalletConnected } = useWalletConnection();
  const isAnyWalletConnected = isFunWalletLinked || isWalletConnected;

  const handleNavClick = (item: typeof navItems[0]) => {
    lightTap(); // Haptic feedback on every nav tap
    
    if (item.isCreate) {
      mediumTap(); // Stronger feedback for create button
      if (user) {
        setUploadModalOpen(true);
      } else {
        navigate("/auth");
      }
      return;
    }
    
    if (item.isWallet) {
      mediumTap();
      if (isAnyWalletConnected) {
        navigate("/fun-wallet");
      } else {
        setWalletModalOpen(true);
      }
      return;
    }
    
    if (item.href) {
      navigate(item.href);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-lg border-t border-border z-50 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-full px-2">
          {navItems.map((item) => {
            const isActive = item.href ? location.pathname === item.href : false;
            const isCreateButton = item.isCreate;
            const isWalletButton = item.isWallet;

            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-full transition-all duration-200 relative",
                  isCreateButton
                    ? "relative"
                    : isWalletButton
                    ? isAnyWalletConnected 
                      ? "text-yellow-500" 
                      : "text-muted-foreground hover:text-foreground"
                    : isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isCreateButton ? (
                  <div className="w-10 h-7 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                    <item.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : isWalletButton ? (
                  <div className="relative">
                    <img 
                      src="/images/fun-wallet-logo.png" 
                      alt="FUN Wallet" 
                      className="h-6 w-6 rounded-full"
                    />
                    {isAnyWalletConnected && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                ) : (
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-all",
                      isActive && "scale-110"
                    )}
                  />
                )}
                <span
                  className={cn(
                    "text-[9px] font-medium",
                    isCreateButton && "mt-0.5"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <UploadVideoModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} />
      
      <WalletSelectionModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
        onSelectFunWallet={() => {}}
        onSelectOtherWallet={() => {}}
      />
    </>
  );
};

import { useState } from 'react';
import { useFunWalletSync } from '@/hooks/useFunWalletSync';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useNavigate } from 'react-router-dom';
import { Loader2, Wallet, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WalletSelectionModal } from './WalletSelectionModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

interface UnifiedWalletButtonProps {
  compact?: boolean;
  className?: string;
}

export const UnifiedWalletButton = ({ compact = false, className }: UnifiedWalletButtonProps) => {
  const navigate = useNavigate();
  const { isLinked, funWalletAddress, isLoading: funWalletLoading } = useFunWalletSync();
  const { isConnected, address, disconnectWallet, isLoading: walletLoading } = useWalletConnection();
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  
  const isAnyConnected = isLinked || isConnected;
  const isAnyLoading = funWalletLoading || walletLoading;
  const displayAddress = funWalletAddress || address;
  
  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  // If connected - show dropdown with options
  if (isAnyConnected && displayAddress) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 h-auto rounded-full",
              "bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-600/10",
              "hover:from-yellow-500/20 hover:via-orange-500/20 hover:to-yellow-600/20",
              "border border-yellow-500/30 transition-all duration-200",
              "hover:shadow-[0_0_10px_rgba(234,179,8,0.3)]",
              compact ? "px-1.5 py-0.5" : "px-2 py-1",
              className
            )}
          >
            <img 
              src="/images/fun-wallet-logo.png" 
              alt="FUN Wallet" 
              className={cn("rounded-full shadow-sm", compact ? "h-4 w-4" : "h-5 w-5")}
            />
            
            {!compact && (
              <>
                <span className="text-xs font-medium text-yellow-500">
                  {formatAddress(displayAddress)}
                </span>
                <ChevronDown className="h-3 w-3 text-yellow-500/70" />
              </>
            )}
            
            {/* Connected indicator */}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => navigate('/fun-wallet')} className="gap-2">
            <img src="/images/fun-wallet-logo.png" alt="FUN" className="h-4 w-4 rounded-full" />
            Mở FUN Wallet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/wallet')} className="gap-2">
            <Wallet className="h-4 w-4" />
            Quản lý ví
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="gap-2 text-destructive">
            Ngắt kết nối
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Not connected - show connect button
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setShowWalletModal(true)}
        disabled={isAnyLoading}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 h-auto rounded-full",
          "bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-600/10",
          "hover:from-yellow-500/20 hover:via-orange-500/20 hover:to-yellow-600/20",
          "border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-200",
          "hover:shadow-[0_0_10px_rgba(234,179,8,0.3)]",
          compact ? "px-1.5 py-0.5" : "px-2.5 py-1.5",
          className
        )}
      >
        <img 
          src="/images/fun-wallet-logo.png" 
          alt="FUN Wallet" 
          className={cn("rounded-full shadow-sm", compact ? "h-4 w-4" : "h-5 w-5")}
        />
        
        {!compact && (
          <span className="text-xs font-medium text-yellow-500">
            {isAnyLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Kết nối ví'
            )}
          </span>
        )}
      </Button>

      <WalletSelectionModal
        open={showWalletModal}
        onOpenChange={setShowWalletModal}
        onSelectFunWallet={() => {}}
        onSelectOtherWallet={() => {}}
      />
    </>
  );
};

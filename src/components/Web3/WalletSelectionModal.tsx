import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, ExternalLink, Copy, Check, Link2 } from "lucide-react";
import { FUN_WALLET_URL, useFunWalletSync } from "@/hooks/useFunWalletSync";
import { toast } from "sonner";

interface WalletSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFunWallet: () => void;
  onSelectOtherWallet: () => void;
  isConnecting?: boolean;
}

export const WalletSelectionModal = ({
  open,
  onOpenChange,
  onSelectFunWallet,
  onSelectOtherWallet,
  isConnecting = false,
}: WalletSelectionModalProps) => {
  const [manualAddress, setManualAddress] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const { linkFunWallet } = useFunWalletSync();
  
  // Listen for callback success from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'FUN_WALLET_CALLBACK_SUCCESS') {
        console.log('[WalletSelectionModal] Received callback success:', event.data.payload);
        toast.success('Đã kết nối FUN Wallet thành công!');
        onOpenChange(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onOpenChange]);
  
  const handleOpenFunWallet = () => {
    // Create callback URL for FUN Wallet to redirect back
    const callbackUrl = `${window.location.origin}/fun-wallet-callback`;
    const funWalletConnectUrl = `${FUN_WALLET_URL}/connect?callback=${encodeURIComponent(callbackUrl)}&app=funplay`;
    
    console.log('[WalletSelectionModal] Opening FUN Wallet connect:', funWalletConnectUrl);
    
    // Open in popup window for better control
    const popup = window.open(
      funWalletConnectUrl,
      'fun-wallet-connect',
      'width=450,height=700,left=100,top=100,scrollbars=yes,resizable=yes'
    );
    
    // If popup blocked, fall back to new tab
    if (!popup) {
      console.log('[WalletSelectionModal] Popup blocked, opening in new tab');
      window.open(funWalletConnectUrl, '_blank');
    }
    
    onSelectFunWallet();
  };

  const handleManualLink = async () => {
    const trimmedAddress = manualAddress.trim();
    
    // Validate address format
    if (!trimmedAddress) {
      toast.error('Vui lòng nhập địa chỉ ví');
      return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      toast.error('Địa chỉ ví không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    
    setIsLinking(true);
    try {
      const success = await linkFunWallet(trimmedAddress);
      if (success) {
        toast.success('Đã liên kết FUN Wallet thành công!');
        setManualAddress("");
        onOpenChange(false);
      } else {
        toast.error('Không thể liên kết ví. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('[WalletSelectionModal] Link error:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLinking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOtherWallet = () => {
    onSelectOtherWallet();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Wallet className="h-5 w-5" />
            Kết nối FUN Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* FUN Wallet Section with Logo */}
          <div className="text-center space-y-3">
            <img 
              src="/images/fun-wallet-logo.png" 
              alt="FUN Wallet" 
              className="h-16 w-16 mx-auto rounded-full shadow-lg ring-4 ring-yellow-500/30"
            />
            <p className="text-sm text-muted-foreground">
              Ví chính thức của hệ sinh thái FUN
            </p>
          </div>

          {/* Manual Link Section */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4 text-primary" />
              Liên kết địa chỉ ví thủ công
            </div>
            
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Mở FUN Wallet và sao chép địa chỉ ví của bạn</li>
              <li>Dán địa chỉ ví vào ô bên dưới</li>
              <li>Nhấn "Liên kết ví" để hoàn tất</li>
            </ol>
            
            <div className="flex gap-2">
              <Input
                placeholder="0x..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                onClick={handleManualLink}
                disabled={isLinking || !manualAddress.trim()}
                className="shrink-0 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                {isLinking ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Liên kết
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Open FUN Wallet Button */}
          <Button
            onClick={handleOpenFunWallet}
            variant="outline"
            className="w-full h-auto p-3 flex items-center justify-center gap-2 border-yellow-500/50 hover:border-yellow-500 hover:bg-yellow-500/10"
          >
            <img 
              src="/images/fun-wallet-logo.png" 
              alt="FUN Wallet" 
              className="h-6 w-6 rounded-full"
            />
            <span>Mở FUN Wallet</span>
            <ExternalLink className="h-4 w-4 ml-1" />
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">hoặc</span>
            </div>
          </div>

          {/* Other Wallets */}
          <Button
            onClick={handleOtherWallet}
            variant="outline"
            disabled={isConnecting}
            className="w-full h-auto p-4 flex items-center gap-3"
          >
            <div className="flex -space-x-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                alt="MetaMask" 
                className="h-8 w-8 rounded-full bg-white p-1"
              />
              <img 
                src="https://img.cryptorank.io/exchanges/bitget1663580368976.png" 
                alt="Bitget" 
                className="h-8 w-8 rounded-full bg-white p-1"
              />
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                +
              </div>
            </div>
            <div className="text-left flex-1">
              <span className="font-medium text-foreground">Kết nối ví khác</span>
              <p className="text-xs text-muted-foreground">
                MetaMask, Bitget, Trust Wallet...
              </p>
            </div>
          </Button>

          {/* Info */}
          <p className="text-xs text-center text-muted-foreground px-4">
            💡 Sử dụng FUN Wallet để đồng bộ tài sản giữa các ứng dụng trong hệ sinh thái FUN
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

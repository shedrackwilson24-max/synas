import React, { createContext, useContext, useEffect, useState } from 'react';
import { createAppKit, useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet, arbitrum, polygon } from '@reown/appkit/networks';
import { BrowserProvider, JsonRpcSigner, type Eip1193Provider } from 'ethers';

// 1. Get projectId at https://cloud.reown.com
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'f7ca1952e807185bc004c8105779774a';

// 2. Set networks
const networks: [any, ...any[]] = [mainnet, arbitrum, polygon];

// 3. Create a metadata object - optional
const metadata = {
  name: 'Synapse Protocol',
  description: 'Neural Dashboard & Protocol',
  url: window.location.origin, // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// 4. Create the AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true // Optional - default to your cloud configuration
  }
});

interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
  signer: JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const initSigner = async () => {
      if (isConnected && walletProvider) {
        const provider = new BrowserProvider(walletProvider as Eip1193Provider);
        const s = await provider.getSigner();
        setSigner(s);
      } else {
        setSigner(null);
      }
    };
    initSigner();
  }, [isConnected, walletProvider]);

  const connect = async () => {
    setIsConnecting(true);
    try {
      await open();
    } catch (error) {
      console.error('Wallet connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    // AppKit handles disconnection via its UI usually, 
    // but we can trigger it if needed.
    // For AppKit, the user usually disconnects via the modal or we can 
    // use internal hooks if they expose a disconnect function.
    // Actually, AppKit modal has a disconnect button.
    await open({ view: 'Account' });
  };

  return (
    <WalletContext.Provider value={{ 
      address, 
      isConnected: !!isConnected, 
      signer, 
      connect, 
      disconnect,
      isConnecting
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

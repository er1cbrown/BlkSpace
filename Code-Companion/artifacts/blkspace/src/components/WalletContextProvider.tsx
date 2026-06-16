import React, { FC, ReactNode, useMemo, Suspense } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Lazily load CSS to prevent render blocking on slow drives
try {
  import('@solana/wallet-adapter-react-ui/styles.css');
} catch (e) {
  console.warn("Wallet adapter styles failed to load lazily", e);
}

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // Standardizing on Devnet for development to prevent real loss of funds
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => {
      try {
        return clusterApiUrl(network);
      } catch (e) {
        return "https://api.devnet.solana.com";
      }
    }, [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <Suspense fallback={<div className="p-4 text-center text-sm text-muted-foreground">Loading Wallet Adapter...</div>}>
                        {children}
                    </Suspense>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

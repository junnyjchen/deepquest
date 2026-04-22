import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebOnlyColorSchemeUpdater } from './ColorSchemeUpdater';
import { HeroUINativeProvider } from '@/heroui';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/config/wagmi';

const queryClient = new QueryClient();

function Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WebOnlyColorSchemeUpdater>
          <AuthProvider>
            <LanguageProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <HeroUINativeProvider>
                  {children}
                </HeroUINativeProvider>
              </GestureHandlerRootView>
            </LanguageProvider>
          </AuthProvider>
        </WebOnlyColorSchemeUpdater>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export {
  Provider,
}

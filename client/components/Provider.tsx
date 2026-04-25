import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebOnlyColorSchemeUpdater } from './ColorSchemeUpdater';
import { HeroUINativeProvider } from '@/heroui';

function Provider({ children }: { children: ReactNode }) {
  return <WebOnlyColorSchemeUpdater>
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
}

export {
  Provider,
}

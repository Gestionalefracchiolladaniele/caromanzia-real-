import React, { createContext, useContext } from 'react';

import { useIsCartomante, useUserRole } from '@/lib/auth-store';
import type { UserRole } from '@/types';

interface RoleContextValue {
  role: UserRole | null;
  isCartomante: boolean;
  isUser: boolean;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  isCartomante: false,
  isUser: true,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const role = useUserRole();
  const isCartomante = useIsCartomante();

  return (
    <RoleContext.Provider value={{ role, isCartomante, isUser: !isCartomante }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);

import React, { createContext, useContext, useState } from 'react';
import { UserRole } from '@lrms/shared';

interface RolePreviewContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
}

const STORAGE_KEY = 'lrms_preview_role';

const RolePreviewContext = createContext<RolePreviewContextType | undefined>(undefined);

export const RolePreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    // Only in development preview: retrieve from localStorage or default to ADMIN
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as UserRole | null;
      if (saved && Object.values(UserRole).includes(saved)) {
        return saved;
      }
    }
    return UserRole.ADMIN;
  });

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, role);
    }
  };

  return (
    <RolePreviewContext.Provider value={{ currentRole, setCurrentRole }}>
      {children}
    </RolePreviewContext.Provider>
  );
};

export function useRolePreview(): RolePreviewContextType {
  const context = useContext(RolePreviewContext);
  if (!context) {
    // Fallback if rendered outside provider (e.g. isolated test)
    return {
      currentRole: UserRole.ADMIN,
      setCurrentRole: () => {},
    };
  }
  return context;
}

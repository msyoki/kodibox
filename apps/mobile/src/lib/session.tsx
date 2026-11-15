import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Role = 'tenant' | 'caretaker' | 'manager';

interface Session {
  /** True once the user has passed the Welcome screen this launch. */
  welcomed: boolean;
  /** E.164 phone, in memory only. Demo sign-in; real auth lands in MA-03. */
  phone: string | null;
  role: Role | null;
  welcome: () => void;
  signIn: (phone: string) => void;
  chooseRole: (role: Role) => void;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [welcomed, setWelcomed] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const value = useMemo<Session>(
    () => ({
      welcomed,
      phone,
      role,
      welcome: () => setWelcomed(true),
      signIn: setPhone,
      chooseRole: setRole,
      signOut: () => {
        setPhone(null);
        setRole(null);
      },
    }),
    [welcomed, phone, role],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

export const ROLE_HOME = { tenant: '/home', caretaker: '/tasks', manager: '/overview' } as const;

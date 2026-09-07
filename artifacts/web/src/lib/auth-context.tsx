import { createContext, useContext, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCustomerSessionQueryKey,
  getGetProfileQueryKey,
  getListOrdersQueryKey,
  useGetCustomerSession,
  useLoginCustomer,
  useLogoutCustomer,
  useRegisterCustomer,
  type Customer,
  type CustomerSession,
} from "@workspace/api-client-react";

type AuthContextValue = {
  customer: Customer | null;
  isLoading: boolean;
  login: ReturnType<typeof useLoginCustomer>;
  register: ReturnType<typeof useRegisterCustomer>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const sessionKey = getGetCustomerSessionQueryKey();

  const { data, isLoading } = useGetCustomerSession({
    query: { queryKey: sessionKey, retry: false, staleTime: 30_000 },
  });

  const cacheSession = (session: CustomerSession) => {
    queryClient.setQueryData(sessionKey, session);
  };

  const login = useLoginCustomer({ mutation: { onSuccess: cacheSession } });
  const register = useRegisterCustomer({ mutation: { onSuccess: cacheSession } });
  const logoutMutation = useLogoutCustomer();

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      queryClient.setQueryData(sessionKey, null);
      queryClient.removeQueries({ queryKey: getGetProfileQueryKey() });
      queryClient.removeQueries({ queryKey: getListOrdersQueryKey() });
    }
  };

  return (
    <AuthContext.Provider
      value={{ customer: data?.user ?? null, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}

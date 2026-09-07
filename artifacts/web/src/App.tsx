import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CartProvider } from '@/lib/cart-context';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/lib/auth-context';
import Home from '@/pages/Home';
import Catalog from '@/pages/Catalog';
import Deals from '@/pages/Deals';
import WhyUr3 from '@/pages/WhyUr3';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Account from '@/pages/Account';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Admin from '@/pages/Admin';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/admin" component={Admin} />
        <Route component={StorefrontRouter} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function StorefrontRouter() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/catalogo" component={Catalog} />
        <Route path="/ofertas" component={Deals} />
        <Route path="/por-que-ur3" component={WhyUr3} />
        <Route path="/produto/:id" component={ProductDetail} />
        <Route path="/carrinho" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/conta" component={Account} />
        <Route path="/entrar" component={Login} />
        <Route path="/cadastrar" component={Register} />
        <Route path="/esqueci-senha" component={ForgotPassword} />
        <Route path="/redefinir-senha" component={ResetPassword} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

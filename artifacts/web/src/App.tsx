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
import Home from '@/pages/Home';
import Catalog from '@/pages/Catalog';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Account from '@/pages/Account';
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
        <Route path="/produto/:id" component={ProductDetail} />
        <Route path="/carrinho" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/conta" component={Account} />
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
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;

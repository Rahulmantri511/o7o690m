import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingBlock } from "@/components/ui/Feedback";
import { DecisionPage } from "@/features/decision/DecisionPage";

const AccuracyPage = lazy(() => import("@/features/accuracy/AccuracyPage").then((m) => ({ default: m.AccuracyPage })));
const MethodologyPage = lazy(() =>
  import("@/features/methodology/MethodologyPage").then((m) => ({ default: m.MethodologyPage })),
);

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<LoadingBlock label="Loading view" height={420} />}>{element}</Suspense>
);

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DecisionPage /> },
      { path: "accuracy", element: withSuspense(<AccuracyPage />) },
      { path: "methodology", element: withSuspense(<MethodologyPage />) },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </QueryClientProvider>
  );
}

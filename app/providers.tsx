"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { ReactNode } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://first-eagle-283.convex.cloud";

let convexClient: ConvexReactClient | null = null;

try {
  convexClient = new ConvexReactClient(CONVEX_URL);
} catch (e) {
  console.warn("Convex client failed to initialize:", e);
}

// Error boundary for Convex failures
class ConvexErrorBoundary extends React.Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("Convex error caught:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function AppContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const fallback = <AppContent>{children}</AppContent>;

  if (!convexClient) {
    return fallback;
  }

  return (
    <ConvexErrorBoundary fallback={fallback}>
      <ConvexProvider client={convexClient}>{children}</ConvexProvider>
    </ConvexErrorBoundary>
  );
}

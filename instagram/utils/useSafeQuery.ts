"use client";
import { useQuery as useConvexQuery } from "convex/react";
import { useState, useEffect } from "react";

/**
 * Safe wrapper around Convex useQuery that returns null during SSR/build
 * when ConvexProvider is not available.
 */
export function useSafeQuery(
  queryRef: any,
  args?: any
): any {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Try to use the real query, but catch errors from missing provider
  if (!mounted) return undefined;
  
  try {
    return useConvexQuery(queryRef, args);
  } catch {
    return undefined;
  }
}

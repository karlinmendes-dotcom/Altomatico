"use client";
import { useQuery as useConvexQuery } from "convex/react";

/**
 * Wrapper around Convex useQuery.
 * The hook must be called unconditionally per React rules.
 * Returns undefined when the result is not yet available.
 */
export function useSafeQuery(
  queryRef: Parameters<typeof useConvexQuery>[0],
  args?: Parameters<typeof useConvexQuery>[1]
) {
  return useConvexQuery(queryRef, args as any);
}

"use client";

import ErrorFallback, { type RouteErrorProps } from "@/components/errors/ErrorFallback";

/**
 * Root segment boundary: catches render errors in any page or nested layout
 * below the root layout. Errors in the root layout itself are not caught here —
 * app/global-error.tsx handles those.
 */
export default function RootError(props: RouteErrorProps) {
  return <ErrorFallback {...props} />;
}

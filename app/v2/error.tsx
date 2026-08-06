"use client";

import ErrorFallback, { type RouteErrorProps } from "@/components/errors/ErrorFallback";

/** Keeps this panel's shell when one of its pages throws. */
export default function V2Error(props: RouteErrorProps) {
  return <ErrorFallback {...props} homeHref="/v2" />;
}

"use client";

import { SystemErrorState } from "@/components/ui/system-error-state";

export default function DriverPortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SystemErrorState reset={reset} homeHref="/portal/motorista" />;
}

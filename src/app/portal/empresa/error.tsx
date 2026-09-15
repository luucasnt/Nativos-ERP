"use client";

import { SystemErrorState } from "@/components/ui/system-error-state";

export default function CompanyPortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SystemErrorState reset={reset} homeHref="/portal/empresa" />;
}

import { Loader2Icon } from "lucide-react";

export function LoadingMessage({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

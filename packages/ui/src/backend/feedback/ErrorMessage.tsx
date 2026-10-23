import type { ReactNode } from "react";

export function ErrorMessage({
  title = "Something went wrong",
  message,
  action,
}: {
  title?: string;
  message?: string;
  /** E.g. a retry button. */
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-4 text-sm">
      <p className="font-medium text-destructive">{title}</p>
      {message && <p className="text-muted-foreground">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "./Illustration";

interface EmptyStateProps {
  illustration: IllustrationName;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ illustration, title, children, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <Illustration name={illustration} className="h-36 w-auto" />
      <h2 className="mt-6 text-xl font-semibold">{title}</h2>
      <div className="mt-2 max-w-md text-sm text-muted">{children}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        illustration="empty-shelf"
        title="This shelf is empty"
        action={
          <Link to="/" className="btn btn-primary">
            Back to the start
          </Link>
        }
      >
        We couldn't find that page.
      </EmptyState>
    </div>
  );
}

import { errorMessage } from "../lib/api";
import { useDemoLogin } from "../lib/auth";
import { FormError } from "./Field";
import { Icon, Spinner } from "./Icon";

interface DemoButtonProps {
  className?: string;
  label?: string;
  /** show a failure message under the button (off in the header, where there's no room) */
  showError?: boolean;
}

// One-click login to the shared, read-only demo shelf. Used on the landing page,
// in the header and on the login/sign-up pages, so a tester can always find it.
export function DemoButton({ className = "", label = "Try the demo", showError = true }: DemoButtonProps) {
  const demo = useDemoLogin();

  return (
    <>
      <button
        type="button"
        className={`btn btn-outline ${className}`}
        onClick={() => demo.mutate()}
        disabled={demo.isPending}
        title="Look around a sample shelf - no sign-up needed"
      >
        {demo.isPending ? <Spinner /> : <Icon name="flask" size={16} />}
        {label}
      </button>
      {showError && demo.isError && (
        <div className="basis-full">
          <FormError message={errorMessage(demo.error)} />
        </div>
      )}
    </>
  );
}

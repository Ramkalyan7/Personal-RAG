import { LibraryBig } from "lucide-react";
import { Link } from "react-router-dom";

type LogoProps = {
  to?: string;
};

export function Logo({ to = "/" }: LogoProps) {
  return (
    <Link className="logo-lockup focus-ring" to={to}>
      <span className="logo-mark" aria-hidden="true">
        <LibraryBig className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
      </span>
      <span className="display-face text-[1.1rem] leading-none sm:text-[1.2rem]">
        Ask Vault
      </span>
    </Link>
  );
}

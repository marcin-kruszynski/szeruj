import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label={href === "/admin" ? "szeruj — panel administratora" : "szeruj — strona główna"}>
      <span className="brand-mark" aria-hidden="true">sz</span>
      <span>szeruj</span>
    </Link>
  );
}

import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import type { DocumentKind } from "@/lib/models";

export const metadata: Metadata = { title: "Panel administratora", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  const formatValue = Array.isArray(params.format) ? params.format[0] : params.format;
  const format: DocumentKind | null =
    formatValue === "markdown" || formatValue === "html" || formatValue === "bundle"
      ? formatValue
      : null;
  return (
    <AdminApp
      initialTab={view === "new" ? "new" : "documents"}
      initialQuery={(query ?? "").slice(0, 200)}
      initialKindFilter={format}
    />
  );
}

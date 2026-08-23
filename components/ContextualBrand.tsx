import { Brand } from "@/components/Brand";
import { currentRequestHasAdminSession } from "@/lib/current-session";

export async function ContextualBrand() {
  const authenticated = await currentRequestHasAdminSession();
  return <Brand href={authenticated ? "/admin" : "/"} />;
}

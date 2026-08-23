import "server-only";

import { headers } from "next/headers";
import { hasAdminSession } from "./auth";

export async function currentRequestHasAdminSession() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  if (!cookie) return false;
  try {
    return await hasAdminSession(
      new Request("http://localhost", { headers: { cookie } })
    );
  } catch {
    return false;
  }
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDemoUser } from "@/lib/demo-user";
import { completeWalletConnect, SETUP_TOKEN_COOKIE } from "@/lib/wallet";

/** PayPal sends the person back here after they approve (or cancel) saving their wallet. */
export async function GET(request: Request) {
  const jar = await cookies();
  const setupTokenId = jar.get(SETUP_TOKEN_COOKIE)?.value;
  jar.delete(SETUP_TOKEN_COOKIE);

  if (new URL(request.url).searchParams.has("cancelled") || !setupTokenId) redirect("/wallet?status=cancelled");

  try {
    const user = await getDemoUser();
    await completeWalletConnect(user.id, setupTokenId);
  } catch (err) {
    console.error("Saving PayPal wallet failed", err);
    redirect("/wallet?status=failed");
  }
  redirect("/wallet?status=connected");
}

import QRCode from "qrcode";
import { env } from "@/lib/env";

/** QR code that opens the approvals page on a phone. */
export async function PhoneQr() {
  const url = `${env("APP_URL")}/approvals`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1f2d38", light: "#00000000" },
  });
  const isLocal = /localhost|127\.0\.0\.1/.test(url);

  return (
    <div className="flex items-center gap-4">
      <div className="size-24 shrink-0 rounded-lg bg-surface p-2 ring-1 ring-line" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="text-[0.9rem]">
        <p className="font-semibold">Approve from your phone</p>
        <p className="mt-0.5 text-ink-2">
          {isLocal ? "Works once deployed; on localhost your phone can't reach this computer." : "Scan to open your approvals."}
        </p>
      </div>
    </div>
  );
}

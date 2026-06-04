import fs from "fs";
import path from "path";

const files = [
  "app/bookings/page.tsx",
  "app/profile/page.tsx",
  "app/hotels/page.tsx",
  "app/homestay/page.tsx",
  "app/guide/page.tsx",
  "app/taxi/page.tsx",
  "app/user/bookings/guide/page.tsx",
  "app/user/bookings/homestay/page.tsx",
  "app/user/orders/taxi/page.tsx",
  "app/user/bookings/guide/[id]/review/page.tsx",
  "app/user/bookings/homestay/[id]/review/page.tsx",
  "app/payments/checkout/[planId]/page.tsx",
  "app/payments/success/page.tsx",
  "app/trip-builder/page.tsx",
];

const reps = [
  [/min-h-screen bg-slate-900 flex/g, "min-h-screen bg-gray-50 flex"],
  [/min-h-screen bg-slate-900/g, "min-h-screen bg-gray-50"],
  [/bg-slate-900\/90/g, "bg-white/90"],
  [/bg-slate-900\/80/g, "bg-gray-900/80"],
  [/bg-slate-800\/90/g, "bg-white/90"],
  [/bg-slate-800\/80/g, "bg-white"],
  [/bg-slate-800/g, "bg-white"],
  [/bg-slate-900/g, "bg-gray-50"],
  [/border-slate-700\/50/g, "border-gray-200"],
  [/border-slate-700/g, "border-gray-200"],
  [/border-slate-600\/50/g, "border-gray-200"],
  [/bg-slate-700\/60/g, "bg-gray-100"],
  [/bg-slate-700\/50/g, "bg-gray-50"],
  [/bg-slate-700\/40/g, "bg-gray-50"],
  [/bg-slate-700\/30/g, "bg-gray-50"],
  [/bg-slate-700/g, "bg-gray-200"],
  [/hover:bg-slate-800/g, "hover:bg-gray-100"],
  [/hover:bg-slate-700\/50/g, "hover:bg-gray-100"],
  [/hover:border-slate-500/g, "hover:border-gray-300"],
  [/text-slate-400/g, "text-gray-500"],
  [/text-slate-500/g, "text-gray-500"],
  [/text-slate-600/g, "text-gray-400"],
  [/text-slate-300/g, "text-gray-700"],
  [/placeholder:text-slate-600/g, "placeholder:text-gray-400"],
  [/placeholder:text-slate-500/g, "placeholder:text-gray-400"],
  [/divide-slate-700\/50/g, "divide-gray-200"],
  [/shadow-slate-900/g, "shadow-gray-900"],
  [/from-slate-700\/50 to-slate-800/g, "from-gray-100 to-white"],
  [/via-slate-800/g, "via-gray-800"],
  [/to-slate-900/g, "to-gray-900"],
  [/from-slate-900/g, "from-gray-900"],
  [/\[color-scheme:dark\]/g, "[color-scheme:light]"],
];

for (const f of files) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) {
    console.warn("skip", f);
    continue;
  }
  let c = fs.readFileSync(p, "utf8");
  let prev;
  do {
    prev = c;
    for (const [a, b] of reps) c = c.replace(a, b);
  } while (c !== prev);
  fs.writeFileSync(p, c);
  console.log("ok", f);
}

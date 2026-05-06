/**
 * End-to-end API smoke test for SafarTrip backend.
 *
 * Runs happy-path checks against a running Next.js dev/prod server.
 * Expects seed-test-data to have been run (for admin + partner listings).
 *
 * Usage:
 *   # In one terminal:
 *   npx tsx scripts/seed-test-data.ts
 *   npm run dev
 *   # In another terminal:
 *   npx tsx scripts/test-api.ts
 *
 * Env:
 *   API_BASE_URL       default http://localhost:3000
 *   ADMIN_EMAIL        default admin@safartrip.uz
 *   ADMIN_PASSWORD     default Admin1234!
 */

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type TestResult = {
  ok: boolean;
  method: HttpMethod;
  path: string;
  status: number;
  message?: string;
  body?: unknown;
};

const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@safartrip.uz";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin1234!";

const TEST_USER = {
  first_name: "Test",
  last_name: "User",
  email: "test@safartrip.uz",
  phone: "+998900999999",
  password: "Test1234!",
};

const results: TestResult[] = [];
let userToken = "";
let adminToken = "";

const state: {
  homestayListingId?: string;
  homestayBookingId?: string;
  taxiServiceId?: string;
  taxiOrderId?: string;
  guideListingId?: string;
  guideBookingId?: string;
  travelPlanId?: string;
  paymentId?: string;
} = {};

function tomorrow(offsetDays = 1): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

async function apiCall<T = unknown>(
  method: HttpMethod,
  path: string,
  opts: {
    token?: string;
    body?: unknown;
    label?: string;
    expectedStatuses?: number[];
  } = {},
): Promise<{ status: number; ok: boolean; data: T | null; raw: string }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let status = 0;
  let raw = "";
  let data: T | null = null;
  let ok = false;
  let errorMessage: string | undefined;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    status = res.status;
    raw = await res.text();
    try {
      data = raw ? (JSON.parse(raw) as T) : null;
    } catch {
      data = null;
    }
    const expected = opts.expectedStatuses ?? [200, 201];
    ok = expected.includes(status);
    if (!ok) {
      errorMessage =
        (data as { message?: string; error?: string } | null)?.message ??
        (data as { message?: string; error?: string } | null)?.error ??
        `Expected ${expected.join(" / ")}, got ${status}`;
    }
  } catch (err) {
    ok = false;
    errorMessage = err instanceof Error ? err.message : String(err);
    raw = errorMessage;
  }

  const label = opts.label ?? path;
  const line = ok
    ? `PASS  ${method.padEnd(5)} ${label.padEnd(46)} [${status}]`
    : `FAIL  ${method.padEnd(5)} ${label.padEnd(46)} [${status}] ${errorMessage ?? ""}`;
  console.log(`${ok ? "[OK]  " : "[!!]  "}${line}`);
  if (!ok) {
    const preview = raw.slice(0, 300);
    if (preview) console.log(`       body: ${preview}`);
  }

  results.push({
    ok,
    method,
    path: label,
    status,
    message: errorMessage,
    body: data ?? raw,
  });

  return { status, ok, data, raw };
}

function skip(method: HttpMethod | "*", path: string, reason: string) {
  console.log(
    `[--]  SKIP  ${String(method).padEnd(5)} ${path.padEnd(46)} ${reason}`,
  );
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function step1Auth() {
  section("STEP 1 — Auth");

  const signup = await apiCall<{ accessToken: string }>(
    "POST",
    "/api/auth/signup",
    {
      body: TEST_USER,
      label: "POST /api/auth/signup",
      expectedStatuses: [201, 409],
    },
  );

  if (signup.status === 201 && signup.data?.accessToken) {
    userToken = signup.data.accessToken;
  }

  const signin = await apiCall<{ accessToken: string }>(
    "POST",
    "/api/auth/signin",
    {
      body: { email: TEST_USER.email, password: TEST_USER.password },
      label: "POST /api/auth/signin",
    },
  );
  if (signin.ok && signin.data?.accessToken) {
    userToken = signin.data.accessToken;
  }
}

async function step2Me() {
  section("STEP 2 — User profile");
  if (!userToken) {
    skip("GET", "/api/user/me", "no user token");
    return;
  }
  await apiCall<{ user: { email: string } }>("GET", "/api/user/me", {
    token: userToken,
    label: "GET /api/user/me",
  });
}

async function step3Homestay() {
  section("STEP 3 — Homestay flow");

  if (!userToken) {
    skip("*", "/api/homestay/*", "no user token");
    return;
  }

  await apiCall(
    "POST",
    "/api/homestay/host/listings",
    {
      token: userToken,
      label: "POST /api/homestay/host/listings (role check)",
      expectedStatuses: [403],
      body: {
        title: "Test listing",
        description: "desc",
        address: "Test",
        city: "Toshkent",
        region: "Toshkent",
        pricePerNight: 200000,
        maxGuests: 2,
        rooms: 1,
        beds: 1,
        bathrooms: 1,
        amenities: [],
        images: [],
      },
    },
  );
  const lastRole = results[results.length - 1];
  if (lastRole.status !== 403) {
    console.log(
      `       note: role mismatch — test user is not home_stay_partner; this is expected`,
    );
  }

  const search = await apiCall<{
    data: Array<{ id: string; maxGuests: number }>;
  }>("GET", "/api/homestay?city=Toshkent", {
    token: userToken,
    label: "GET /api/homestay?city=Toshkent",
  });
  const listingId = search.data?.data?.[0]?.id;
  state.homestayListingId = listingId;

  if (!listingId) {
    skip(
      "GET",
      "/api/homestay/[id]",
      "no active homestay listings found — run seed-test-data.ts",
    );
    return;
  }

  await apiCall("GET", `/api/homestay/${listingId}`, {
    token: userToken,
    label: "GET /api/homestay/[id]",
  });

  const checkIn = tomorrow(1);
  const checkOut = tomorrow(3);

  await apiCall(
    "POST",
    `/api/homestay/${listingId}/check-availability`,
    {
      token: userToken,
      label: "POST /api/homestay/[id]/check-availability",
      body: {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guestCount: 2,
      },
    },
  );

  const booking = await apiCall<{ id: string; travelPlanId: string }>(
    "POST",
    "/api/homestay/bookings",
    {
      token: userToken,
      label: "POST /api/homestay/bookings",
      body: {
        listingId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guestCount: 2,
        guestNote: "API test booking",
      },
    },
  );
  if (booking.ok && booking.data?.id) {
    state.homestayBookingId = booking.data.id;
    if (booking.data.travelPlanId) state.travelPlanId = booking.data.travelPlanId;
  }

  await apiCall("GET", "/api/homestay/bookings", {
    token: userToken,
    label: "GET /api/homestay/bookings",
  });

  if (state.homestayBookingId) {
    await apiCall(
      "PATCH",
      `/api/homestay/bookings/${state.homestayBookingId}`,
      {
        token: userToken,
        label: "PATCH /api/homestay/bookings/[id] (cancel)",
        body: { cancellationReason: "API test cleanup" },
      },
    );
  }
}

async function step4Taxi() {
  section("STEP 4 — Taxi flow");
  if (!userToken) {
    skip("*", "/api/taxi/*", "no user token");
    return;
  }

  const services = await apiCall<{
    data: Array<{ id: string; title: string }>;
  }>("GET", "/api/taxi/services", {
    token: userToken,
    label: "GET /api/taxi/services",
  });
  const serviceId = services.data?.data?.[0]?.id;
  state.taxiServiceId = serviceId;

  await apiCall("POST", "/api/taxi/estimate", {
    token: userToken,
    label: "POST /api/taxi/estimate",
    body: {
      pickupLat: 41.2995,
      pickupLng: 69.2401,
      dropoffLat: 41.3111,
      dropoffLng: 69.2799,
      serviceId,
    },
  });

  if (!serviceId) {
    skip("POST", "/api/taxi/orders", "no taxi service found — run seed-test-data.ts");
    return;
  }

  const order = await apiCall<{ id: string }>(
    "POST",
    "/api/taxi/orders",
    {
      token: userToken,
      label: "POST /api/taxi/orders",
      body: {
        pickupAddress: "Tashkent central",
        dropoffAddress: "Tashkent airport",
        pickupLat: 41.2995,
        pickupLng: 69.2401,
        dropoffLat: 41.3111,
        dropoffLng: 69.2799,
        serviceId,
        customerNote: "API test order",
      },
    },
  );
  if (order.ok && order.data?.id) state.taxiOrderId = order.data.id;

  await apiCall("GET", "/api/taxi/orders", {
    token: userToken,
    label: "GET /api/taxi/orders",
  });

  if (state.taxiOrderId) {
    await apiCall(
      "PATCH",
      `/api/taxi/orders/${state.taxiOrderId}`,
      {
        token: userToken,
        label: "PATCH /api/taxi/orders/[id] (cancel)",
        body: { cancellationReason: "API test cleanup" },
      },
    );
  }
}

async function step5Guide() {
  section("STEP 5 — Guide flow");
  if (!userToken) {
    skip("*", "/api/guide/*", "no user token");
    return;
  }

  const search = await apiCall<{ data: Array<{ id: string }> }>(
    "GET",
    "/api/guide",
    { token: userToken, label: "GET /api/guide" },
  );
  const listingId = search.data?.data?.[0]?.id;
  state.guideListingId = listingId;

  if (!listingId) {
    skip(
      "POST",
      "/api/guide/[id]/check-availability",
      "no guide listings found — run seed-test-data.ts",
    );
    return;
  }

  const date = tomorrow(1);

  await apiCall(
    "POST",
    `/api/guide/${listingId}/check-availability`,
    {
      token: userToken,
      label: "POST /api/guide/[id]/check-availability",
      body: {
        date: date.toISOString(),
        startTime: "10:00",
        endTime: "14:00",
        groupSize: 2,
      },
    },
  );

  const booking = await apiCall<{ id: string; travelPlanId: string | null }>(
    "POST",
    "/api/guide/bookings",
    {
      token: userToken,
      label: "POST /api/guide/bookings",
      body: {
        listingId,
        date: date.toISOString(),
        startTime: "10:00",
        endTime: "14:00",
        groupSize: 2,
        customerNote: "API test guide booking",
      },
    },
  );
  if (booking.ok && booking.data?.id) {
    state.guideBookingId = booking.data.id;
    if (!state.travelPlanId && booking.data.travelPlanId) {
      state.travelPlanId = booking.data.travelPlanId;
    }
  }

  await apiCall("GET", "/api/guide/bookings", {
    token: userToken,
    label: "GET /api/guide/bookings",
  });

  if (state.guideBookingId) {
    await apiCall(
      "PATCH",
      `/api/guide/bookings/${state.guideBookingId}`,
      {
        token: userToken,
        label: "PATCH /api/guide/bookings/[id] (cancel)",
        body: { cancellationReason: "API test cleanup" },
      },
    );
  }
}

async function step6Payment() {
  section("STEP 6 — Payment flow");
  if (!userToken) {
    skip("*", "/api/payments/*", "no user token");
    return;
  }

  await apiCall("GET", "/api/payments/manual-info", {
    token: userToken,
    label: "GET /api/payments/manual-info",
  });

  // The travel plans we captured were likely auto-cancelled back to DRAFT when we cancelled the
  // homestay/guide bookings. Create a brand-new PENDING_PAYMENT plan for the payment test instead.
  const planRes = await apiCall<{ planId: string }>(
    "POST",
    "/api/travel-plans",
    {
      token: userToken,
      label: "POST /api/travel-plans (for payment test)",
      body: {
        destination: "API payment test",
        startDate: tomorrow(5).toISOString(),
        endDate: tomorrow(7).toISOString(),
        pax: 2,
        taxi: state.taxiServiceId
          ? { id: state.taxiServiceId, title: "API test taxi", price: 50000 }
          : undefined,
        note: "Created by test-api.ts",
      },
    },
  );
  const planId = planRes.data?.planId ?? state.travelPlanId;
  state.travelPlanId = planId;

  if (!planId) {
    skip("POST", "/api/payments/create", "no travel plan available");
    return;
  }

  const pay = await apiCall<{ paymentId: string; paymentUrl: string }>(
    "POST",
    "/api/payments/create",
    {
      token: userToken,
      label: "POST /api/payments/create (MOCK)",
      body: { planId, provider: "MOCK" },
    },
  );
  if (pay.ok && pay.data?.paymentId) state.paymentId = pay.data.paymentId;

  if (state.paymentId) {
    await apiCall(
      "POST",
      `/api/payments/webhook/mock/${state.paymentId}`,
      {
        token: userToken,
        label: "POST /api/payments/webhook/mock/[id]",
      },
    );
  }

  const plans = await apiCall<{
    items: Array<{ id: string; status: string }>;
  }>("GET", "/api/travel-plans", {
    token: userToken,
    label: "GET /api/travel-plans",
  });

  if (plans.ok && planId) {
    const plan = plans.data?.items?.find((p) => p.id === planId);
    if (!plan) {
      console.log(
        `       note: plan ${planId} not found in /api/travel-plans response`,
      );
    } else if (plan.status !== "CONFIRMED") {
      console.log(
        `       note: plan status is ${plan.status} (expected CONFIRMED after mock webhook)`,
      );
    } else {
      console.log(`       [plan] ${planId} = CONFIRMED`);
    }
  }
}

async function step7Admin() {
  section("STEP 7 — Admin endpoints");

  const signin = await apiCall<{ accessToken: string; user: { role: string } }>(
    "POST",
    "/api/auth/signin",
    {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      label: "POST /api/auth/signin (admin)",
    },
  );
  if (signin.ok && signin.data?.accessToken) {
    adminToken = signin.data.accessToken;
  }
  if (!adminToken) {
    skip(
      "*",
      "/api/admin/*",
      `admin signin failed — run scripts/seed-test-data.ts (expects ${ADMIN_EMAIL}/${ADMIN_PASSWORD})`,
    );
    return;
  }

  const endpoints: Array<{ method: HttpMethod; path: string }> = [
    { method: "GET", path: "/api/admin/homestay/listings" },
    { method: "GET", path: "/api/admin/taxi/orders" },
    { method: "GET", path: "/api/admin/guide/bookings" },
    { method: "GET", path: "/api/admin/payments" },
  ];
  for (const ep of endpoints) {
    await apiCall(ep.method, ep.path, {
      token: adminToken,
      label: `${ep.method} ${ep.path}`,
    });
  }
}

function printSummary() {
  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  const failed = total - passed;

  console.log("\n==================== SUMMARY ====================");
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    for (const r of results.filter((r) => !r.ok)) {
      console.log(
        `  ${r.method.padEnd(5)} ${r.path}  [${r.status}]  ${r.message ?? ""}`,
      );
    }
  }
  console.log("=================================================");
}

async function main() {
  console.log(`SafarTrip API test — ${BASE_URL}`);
  try {
    await step1Auth();
    await step2Me();
    await step3Homestay();
    await step4Taxi();
    await step5Guide();
    await step6Payment();
    await step7Admin();
  } finally {
    printSummary();
  }
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error("[test-api] unexpected error", e);
  printSummary();
  process.exit(1);
});

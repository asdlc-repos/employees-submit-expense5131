import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/expense-api";

// State lives in THIS module, in the page's own JS context: a create shows up in
// the next list, but any full page load re-runs the module and restores the seed
// rows below. Only in-app navigation carries a change forward. The seed is the
// records of the prototype (prototype.tsx), mapped onto the API schema.

type Claim = components["schemas"]["Claim"];
type LineItem = components["schemas"]["LineItem"];
type LineItemInput = components["schemas"]["LineItemInput"];
type Person = components["schemas"]["Person"];
type Export = components["schemas"]["Export"];

interface Row extends Omit<Claim, "lineItems" | "employeeName"> {
  ownerId: string;
  lineItems: LineItem[];
}

const people: Person[] = [
  { id: "people-1", username: "test-employee", displayName: "Maya Fernando", managerId: "people-3", managerName: "Ravi Perera" },
  { id: "people-2", username: "test-employee-2", displayName: "Ana Silva", managerId: "people-3", managerName: "Ravi Perera" },
  { id: "people-3", username: "test-manager", displayName: "Ravi Perera", managerId: null, managerName: null },
  { id: "people-4", username: "test-finance", displayName: "Nadia Kumar", managerId: null, managerName: null },
  { id: "people-5", username: "tom", displayName: "Tom Wijesinghe", managerId: null, managerName: null },
];
const nameOf = (id: string) => people.find((p) => p.id === id)?.displayName ?? "";

// The caller this mock speaks for, resolved from the role segment of the mock
// bearer (`mock:<roles>;<scopes>`), never from a query parameter.
function callerOf(request: Request): Person {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  const roles = decodeURIComponent(token.slice("mock:".length).split(";")[0] ?? "").toLowerCase();
  const username = roles.includes("finance")
    ? "test-finance"
    : roles.includes("manager")
      ? "test-manager"
      : "test-employee";
  return people.find((p) => p.username === username)!;
}

const item = (id: string, date: string, category: LineItem["category"], cents: number, description: string, receipt: string | null): LineItem => ({
  id, expenseDate: date, category, amountCents: cents, description, receiptReference: receipt,
});

let claims: Row[] = [
  { id: "claims-1042", number: "C-1042", ownerId: "people-1", status: "pending", totalCents: 6020, submittedAt: "2026-01-12T09:00:00Z", decidedAt: null, rejectionReason: null, exportedAt: null,
    lineItems: [item("items-1", "2026-01-10", "travel", 4200, "Taxi to the airport", "taxi-0110.pdf"), item("items-2", "2026-01-11", "meals", 1820, "Team lunch", null)] },
  { id: "claims-1039", number: "C-1039", ownerId: "people-1", status: "rejected", totalCents: 14820, submittedAt: "2026-01-05T09:00:00Z", decidedAt: "2026-01-06T09:00:00Z", rejectionReason: "The hotel receipt is missing. Attach it and resubmit.", exportedAt: null,
    lineItems: [item("items-3", "2026-01-04", "accommodation", 14820, "Hotel, one night", null)] },
  { id: "claims-1027", number: "C-1027", ownerId: "people-1", status: "approved", totalCents: 8640, submittedAt: "2026-01-02T09:00:00Z", decidedAt: "2026-01-04T09:00:00Z", rejectionReason: null, exportedAt: "2026-01-05T09:00:00Z",
    lineItems: [item("items-4", "2026-01-01", "travel", 8640, "Train to Kandy", "train.pdf")] },
  { id: "claims-1033", number: "C-1033", ownerId: "people-1", status: "approved", totalCents: 5560, submittedAt: "2026-01-09T09:00:00Z", decidedAt: "2026-01-10T09:00:00Z", rejectionReason: null, exportedAt: null,
    lineItems: [item("items-5", "2026-01-08", "meals", 2400, "Client dinner", null), item("items-6", "2026-01-08", "supplies", 3160, "Printer paper", "paper.pdf")] },
  { id: "claims-1031", number: "C-1031", ownerId: "people-2", status: "approved", totalCents: 6200, submittedAt: "2026-01-03T09:00:00Z", decidedAt: "2026-01-05T09:00:00Z", rejectionReason: null, exportedAt: null,
    lineItems: [item("items-7", "2026-01-02", "travel", 6200, "Fuel", "fuel.pdf")] },
  { id: "claims-1045", number: "C-1045", ownerId: "people-2", status: "pending", totalCents: 2250, submittedAt: "2026-01-13T09:00:00Z", decidedAt: null, rejectionReason: null, exportedAt: null,
    lineItems: [item("items-8", "2026-01-12", "meals", 2250, "Workshop snacks", null)] },
  { id: "claims-1050", number: "C-1050", ownerId: "people-3", status: "draft", totalCents: 1500, submittedAt: null, decidedAt: null, rejectionReason: null, exportedAt: null,
    lineItems: [item("items-9", "2026-01-13", "supplies", 1500, "Notebooks", null)] },
];

let exportsList: Export[] = [
  { id: "payouts-1", createdAt: "2026-01-05T09:00:00Z", createdByName: "Nadia Kumar", claimCount: 1, totalCents: 8640 },
];

let nextId = 2000;

const err = (status: number, message: string) =>
  HttpResponse.json({ code: status, message }, { status });

const view = (row: Row, withItems: boolean): Claim => {
  const { ownerId, lineItems, ...rest } = row;
  return { ...rest, employeeName: nameOf(ownerId), ...(withItems ? { lineItems } : {}) };
};
const total = (items: { amountCents: number }[]) => items.reduce((s, i) => s + i.amountCents, 0);
const page = <T,>(rows: T[], url: URL) => {
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  return { count: rows.length, next: null, previous: null, data: rows.slice(offset, offset + limit) };
};
const exportable = () => claims.filter((c) => c.status === "approved" && !c.exportedAt);
const teamOf = (me: Person) => new Set(people.filter((p) => p.managerId === me.id).map((p) => p.id));

function itemsFrom(input: LineItemInput[]): LineItem[] {
  return input.map((i) => ({ id: `items-${nextId++}`, ...i }));
}
function badItems(input: LineItemInput[] | undefined): string | null {
  if (!input?.length) return "A claim needs at least one line item.";
  for (const i of input) {
    if (!(i.amountCents > 0)) return "The amount must be above zero.";
    if (i.amountCents > 2500 && !i.receiptReference?.trim()) return "A receipt is required for line items above $25.00.";
  }
  return null;
}

// Order: most specific first (MSW takes the first match).
export const handlers = [
  http.get("/api/health", () => new HttpResponse(null, { status: 200 })),

  http.get("/api/me", ({ request }) => {
    const me = callerOf(request);
    return HttpResponse.json({ id: me.id, username: me.username, displayName: me.displayName, managerName: me.managerName ?? null });
  }),

  // --- the caller's claims: /me/ means the caller's rows, 404 for anyone else's
  http.get("/api/me/claims", ({ request }) => {
    const me = callerOf(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const rows = claims.filter((c) => c.ownerId === me.id && (!status || c.status === status)).map((c) => view(c, false));
    return HttpResponse.json(page(rows, url));
  }),
  http.post("/api/me/claims", async ({ request }) => {
    const me = callerOf(request);
    const body = (await request.json()) as { lineItems?: LineItemInput[] };
    const problem = badItems(body.lineItems);
    if (problem) return err(400, problem);
    const lineItems = itemsFrom(body.lineItems!);
    const row: Row = { id: `claims-${nextId}`, number: `C-${nextId++}`, ownerId: me.id, status: "draft", totalCents: total(lineItems), submittedAt: null, decidedAt: null, rejectionReason: null, exportedAt: null, lineItems };
    claims = [row, ...claims];
    return HttpResponse.json(view(row, true), { status: 201 });
  }),
  http.post("/api/me/claims/:claimId/submit", ({ request, params }) => {
    const me = callerOf(request);
    const row = claims.find((c) => c.id === params.claimId && c.ownerId === me.id);
    if (!row) return err(404, "Claim not found");
    if (row.status !== "draft" && row.status !== "rejected") return err(409, "The claim cannot be submitted in its state.");
    if (!me.managerId) return err(400, "No line manager is assigned to you.");
    const problem = badItems(row.lineItems);
    if (problem) return err(400, problem);
    row.status = "pending"; row.submittedAt = new Date().toISOString(); row.rejectionReason = null;
    return HttpResponse.json(view(row, true));
  }),
  http.post("/api/me/claims/:claimId/withdraw", ({ request, params }) => {
    const me = callerOf(request);
    const row = claims.find((c) => c.id === params.claimId && c.ownerId === me.id);
    if (!row) return err(404, "Claim not found");
    if (row.status !== "pending") return err(409, "Only a pending claim can be withdrawn.");
    row.status = "withdrawn";
    return HttpResponse.json(view(row, true));
  }),
  http.get("/api/me/claims/:claimId", ({ request, params }) => {
    const row = claims.find((c) => c.id === params.claimId && c.ownerId === callerOf(request).id);
    return row ? HttpResponse.json(view(row, true)) : err(404, "Claim not found");
  }),
  http.put("/api/me/claims/:claimId", async ({ request, params }) => {
    const row = claims.find((c) => c.id === params.claimId && c.ownerId === callerOf(request).id);
    if (!row) return err(404, "Claim not found");
    if (!["draft", "pending", "rejected"].includes(row.status)) return err(409, "The claim cannot be edited in its state.");
    const body = (await request.json()) as { lineItems?: LineItemInput[] };
    const problem = badItems(body.lineItems);
    if (problem) return err(400, problem);
    row.lineItems = itemsFrom(body.lineItems!);
    row.totalCents = total(row.lineItems);
    return HttpResponse.json(view(row, true));
  }),

  // --- the team's claims: the people the caller manages
  http.get("/api/me/team/claims", ({ request }) => {
    const team = teamOf(callerOf(request));
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const rows = claims
      .filter((c) => team.has(c.ownerId) && c.status !== "draft" && (!status || c.status === status))
      .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
      .map((c) => view(c, false));
    return HttpResponse.json(page(rows, url));
  }),
  http.post("/api/me/team/claims/:claimId/approve", ({ request, params }) => {
    const row = claims.find((c) => c.id === params.claimId && teamOf(callerOf(request)).has(c.ownerId));
    if (!row) return err(404, "Claim not found");
    if (row.status !== "pending") return err(409, "Only a pending claim can be decided.");
    row.status = "approved"; row.decidedAt = new Date().toISOString();
    return HttpResponse.json(view(row, true));
  }),
  http.post("/api/me/team/claims/:claimId/reject", async ({ request, params }) => {
    const row = claims.find((c) => c.id === params.claimId && teamOf(callerOf(request)).has(c.ownerId));
    if (!row) return err(404, "Claim not found");
    const body = (await request.json()) as { reason?: string };
    if (!body.reason?.trim()) return err(400, "A reason is required.");
    if (row.status !== "pending") return err(409, "Only a pending claim can be decided.");
    row.status = "rejected"; row.decidedAt = new Date().toISOString(); row.rejectionReason = body.reason;
    return HttpResponse.json(view(row, true));
  }),
  http.get("/api/me/team/claims/:claimId", ({ request, params }) => {
    const row = claims.find((c) => c.id === params.claimId && c.status !== "draft" && teamOf(callerOf(request)).has(c.ownerId));
    return row ? HttpResponse.json(view(row, true)) : err(404, "Claim not found");
  }),

  // --- payroll exports (every row: not under /me/)
  http.get("/api/export-queue", ({ request }) =>
    HttpResponse.json(page(exportable().map((c) => view(c, false)), new URL(request.url))),
  ),
  http.get("/api/exports/:exportId/file", ({ params }) => {
    const exp = exportsList.find((e) => e.id === params.exportId);
    if (!exp) return err(404, "Export not found");
    const lines = claims.filter((c) => c.exportedAt && exp.claims?.some((x) => x.id === c.id) !== false)
      .map((c) => `${nameOf(c.ownerId)},${c.number},${(c.totalCents / 100).toFixed(2)},${c.decidedAt ?? ""}`);
    return new HttpResponse(["employee,claim,total,approved", ...lines].join("\n"), { headers: { "Content-Type": "text/csv" } });
  }),
  http.get("/api/exports/:exportId", ({ params }) => {
    const exp = exportsList.find((e) => e.id === params.exportId);
    return exp ? HttpResponse.json(exp) : err(404, "Export not found");
  }),
  http.get("/api/exports", ({ request }) => HttpResponse.json(page(exportsList.map(({ claims: _c, ...e }) => e), new URL(request.url)))),
  http.post("/api/exports", ({ request }) => {
    const waiting = exportable();
    if (waiting.length === 0) return err(409, "No approved claim is waiting for export.");
    const now = new Date().toISOString();
    waiting.forEach((c) => { c.exportedAt = now; });
    const exp: Export = {
      id: `payouts-${nextId++}`, createdAt: now, createdByName: callerOf(request).displayName,
      claimCount: waiting.length, totalCents: waiting.reduce((s, c) => s + c.totalCents, 0), claims: waiting.map((c) => view(c, false)),
    };
    exportsList = [exp, ...exportsList];
    return HttpResponse.json(exp, { status: 201 });
  }),

  // --- people
  http.get("/api/people", ({ request }) => HttpResponse.json(page(people, new URL(request.url)))),
  http.put("/api/people/:personId/manager", async ({ request, params }) => {
    const person = people.find((p) => p.id === params.personId);
    if (!person) return err(404, "Person not found");
    const body = (await request.json()) as { managerId: string | null };
    if (body.managerId === person.id) return err(400, "Nobody is their own line manager.");
    if (body.managerId && !people.some((p) => p.id === body.managerId)) return err(404, "Manager not found");
    person.managerId = body.managerId;
    person.managerName = body.managerId ? nameOf(body.managerId) : null;
    return HttpResponse.json(person);
  }),
];

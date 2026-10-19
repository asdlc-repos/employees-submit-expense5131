import { useState, type ReactNode } from "react";
import {
  Alert, AppShell, Breadcrumbs, Button, Detail, Dialog, EmptyState, Field, Form, Heading, Screen, Section,
  Stat, StatGroup, Table, ValidationSummary, defineApp, useCollection, useDisplayState, useNav, useParams,
  useRole, useToday,
} from "@wso2/prototype-kit";

interface Claim {
  id: string; number: string; employee: string; status: string;
  submitted: string; decided: string; reason: string; exported: string;
}
interface Item {
  id: string; claimId: string; date: string; category: string; amount: number; description: string; receipt: string;
}
interface Person { id: string; name: string; manager: string }
interface Payout { id: string; ran: string; count: number; total: string }

const fmt = (n: number) => `$${n.toFixed(2)}`;
const statusTone = (s: string): "warning" | "success" | "error" | "default" =>
  s === "Pending" ? "warning" : s === "Approved" ? "success" : s === "Rejected" ? "error" : "default";
const team = ["Maya Fernando", "Ana Silva"];

const people = {
  Employee: { name: "Maya Fernando", email: "maya.fernando@acme.example" },
  Manager: { name: "Ravi Perera", email: "ravi.perera@acme.example" },
  Finance: { name: "Nadia Kumar", email: "nadia.kumar@acme.example" },
};
const userFor = (role: string) => (role === "Manager" ? people.Manager : role === "Finance" ? people.Finance : people.Employee);

function Shell({ children }: { children: ReactNode }) {
  const role = useRole();
  return (
    <AppShell
      id="shell"
      user={userFor(role)}
      nav={[
        { id: "nav.my-claims", label: "My claims", to: "screen.my-claims" },
        { id: "nav.approvals", label: "Approvals", to: "screen.approvals" },
        { id: "nav.export", label: "Payroll export", to: "screen.export" },
        { id: "nav.people", label: "People", to: "screen.people" },
      ]}
      account="screen.account"
      signOut="screen.signed-out"
    >
      {children}
    </AppShell>
  );
}

function totalOf(items: readonly Item[], claimId: string) {
  return items.filter((i) => i.claimId === claimId).reduce((sum, i) => sum + i.amount, 0);
}

function itemRows(items: readonly Item[]) {
  return items.map((i) => ({
    id: `item.${i.id}`,
    cells: [i.date, i.category, i.description, i.receipt || "None", fmt(i.amount)],
  }));
}
const itemColumns = ["Date", "Category", "Description", "Receipt", { label: "Amount", kind: "number" as const }];

function MyClaims() {
  const state = useDisplayState();
  const me = userFor(useRole()).name;
  const claims = useCollection<Claim>("claims");
  const items = useCollection<Item>("items");
  const mine = state === "state.empty" ? [] : claims.items.filter((c) => c.employee === me);
  const count = (s: string) => mine.filter((c) => c.status === s).length;
  return (
    <Shell>
      <Heading id="heading.my-claims" text="My claims" />
      {state === "state.failed" && (
        <Alert id="alert.load-failed" tone="error" title="Claims unavailable" text="Your claims could not be loaded. Try again in a few minutes." />
      )}
      <StatGroup>
        <Stat id="stat.pending" label="Pending" value={String(count("Pending"))} hint="waiting for your manager" icon="Clock" tone="warning" />
        <Stat id="stat.approved" label="Approved" value={String(count("Approved"))} hint="ready for payroll" icon="CircleCheck" tone="success" />
        <Stat id="stat.rejected" label="Rejected" value={String(count("Rejected"))} hint="need your attention" icon="CircleX" tone="error" />
      </StatGroup>
      <Section
        id="section.claims"
        title="Claims"
        count={mine.length}
        subtitle="Open a claim to see its items, its status and any rejection reason."
        actions={<Button id="btn.new-claim" label="New claim" emphasis="primary" to="screen.claim-form" />}
      >
        <Table
          id="table.claims"
          columns={["Claim", "Submitted", { label: "Total", kind: "number" }, { label: "Status", kind: "status" }]}
          rows={mine.map((c) => ({
            id: `claim.${c.id}`,
            cells: [c.number, c.submitted || "Not submitted", fmt(totalOf(items.items, c.id))],
            status: { text: c.status, tone: statusTone(c.status) },
            to: "screen.claim-detail",
            params: { claim: c.id },
            actions: c.status === "Pending"
              ? [{ id: `claim.${c.id}.withdraw`, label: "Withdraw", emphasis: "danger" as const, onPress: () => claims.update(c.id, { status: "Withdrawn" }) }]
              : [],
          }))}
          empty={<EmptyState id="empty.claims" title="No claims yet" text="Create a claim to get reimbursed for an expense." />}
        />
      </Section>
    </Shell>
  );
}

function ClaimForm() {
  const { claim: id } = useParams();
  const state = useDisplayState();
  const navigate = useNav();
  const today = useToday();
  const me = userFor(useRole()).name;
  const claims = useCollection<Claim>("claims");
  const items = useCollection<Item>("items");
  const [error, setError] = useState<string | undefined>();
  const claim = id ? claims.get(id) : undefined;
  const lines = claim ? items.items.filter((i) => i.claimId === claim.id) : [];
  const issue = state === "state.validation-error" ? "A receipt is required for line items above $25.00." : error;

  const addItem = (v: Record<string, string>) => {
    const amount = Number(v.amount ?? "0");
    if (!(amount > 0)) { setError("The amount must be above zero."); return; }
    if (amount > 25 && !(v.receipt ?? "").trim()) { setError("A receipt is required for line items above $25.00."); return; }
    setError(undefined);
    const claimId = claim
      ? claim.id
      : claims.create({ number: "Draft", employee: me, status: "Draft", submitted: "", decided: "", reason: "", exported: "" });
    items.create({ claimId, date: v.date ?? today, category: v.category ?? "Other", amount, description: v.description ?? "", receipt: v.receipt ?? "" });
    navigate.go("screen.claim-form", { claim: claimId });
  };
  const submit = () => {
    if (!claim || lines.length === 0) { setError("Add at least one line item before submitting."); return; }
    claims.update(claim.id, { status: "Pending", submitted: today, reason: "" });
    navigate.go("screen.claim-detail", { claim: claim.id });
  };

  return (
    <Shell>
      <Breadcrumbs id="crumbs.form" items={[{ id: "crumb.claims", label: "My claims", to: "screen.my-claims" }, { id: "crumb.form", label: claim ? claim.number : "New claim" }]} />
      <Heading id="heading.claim-form" text={claim ? `Edit claim ${claim.number}` : "New claim"} />
      {state === "state.failed" && (
        <Alert id="alert.no-manager" tone="error" title="No line manager assigned" text="You cannot submit until Finance assigns your line manager. Ask Finance to set it up." />
      )}
      {issue && <ValidationSummary id="summary.form" issues={[issue]} />}
      <Section id="section.items" title="Line items" count={lines.length} subtitle="A receipt is required above $25.00.">
        <Table
          id="table.items"
          columns={itemColumns}
          rows={lines.map((i) => ({ ...itemRows([i])[0]!, actions: [{ id: `item.${i.id}.remove`, label: "Remove", emphasis: "danger" as const, onPress: () => items.remove(i.id) }] }))}
          empty={<EmptyState id="empty.items" title="No line items" text="Add the first expense below." />}
        />
      </Section>
      <Form id="form.item" title="Add a line item" onSubmit={addItem} actions={<Button id="btn.add-item" label="Add line item" submit />}>
        <Field id="field.date" name="date" label="Date" type="date" required />
        <Field id="field.category" name="category" label="Category" type="select" options={["Travel", "Meals", "Accommodation", "Supplies", "Other"]} required />
        <Field id="field.amount" name="amount" label="Amount" type="number" required />
        <Field id="field.description" name="description" label="Description" required />
        <Field id="field.receipt" name="receipt" label="Receipt file name" placeholder="receipt.pdf" error={state === "state.validation-error" ? "Attach a receipt for this amount" : undefined} />
      </Form>
      <Button id="btn.submit-claim" label="Submit claim" emphasis="primary" onPress={submit} />
      <Button id="btn.save-draft" label="Save draft" to="screen.my-claims" />
    </Shell>
  );
}

function ClaimDetail() {
  const { claim: id } = useParams();
  const navigate = useNav();
  const today = useToday();
  const me = userFor(useRole()).name;
  const claims = useCollection<Claim>("claims");
  const items = useCollection<Item>("items");
  const claim = (id ? claims.get(id) : undefined) ?? claims.items.find((c) => c.employee === me) ?? claims.items[0]!;
  const lines = items.items.filter((i) => i.claimId === claim.id);
  const editable = claim.status === "Draft" || claim.status === "Pending" || claim.status === "Rejected";
  return (
    <Shell>
      <Breadcrumbs id="crumbs.detail" items={[{ id: "crumb.claims", label: "My claims", to: "screen.my-claims" }, { id: "crumb.claim", label: claim.number }]} />
      <Heading id="heading.claim-detail" text={`Claim ${claim.number}`} />
      {claim.status === "Rejected" && <Alert id="alert.rejected" tone="error" title="Rejected" text={claim.reason} />}
      {claim.status === "Approved" && <Alert id="alert.approved" tone="info" text="Approved claims can no longer be edited or withdrawn." />}
      <Detail
        id="detail.claim"
        fields={[
          { label: "Status", value: claim.status },
          { label: "Submitted", value: claim.submitted || "Not submitted" },
          { label: "Total", value: fmt(totalOf(items.items, claim.id)) },
        ]}
      />
      <Section id="section.items" title="Line items" count={lines.length}>
        <Table id="table.items" columns={itemColumns} rows={itemRows(lines)} />
      </Section>
      {editable && <Button id="btn.edit" label="Edit claim" to="screen.claim-form" params={{ claim: claim.id }} />}
      {claim.status === "Rejected" && (
        <Button id="btn.resubmit" label="Resubmit" emphasis="primary" onPress={() => claims.update(claim.id, { status: "Pending", submitted: today, reason: "" })} />
      )}
      {claim.status === "Pending" && (
        <Button id="btn.withdraw" label="Withdraw claim" emphasis="danger" onPress={() => { claims.update(claim.id, { status: "Withdrawn" }); navigate.go("screen.my-claims"); }} />
      )}
    </Shell>
  );
}

function Approvals() {
  const state = useDisplayState();
  const today = useToday();
  const claims = useCollection<Claim>("claims");
  const items = useCollection<Item>("items");
  const queue = state === "state.empty"
    ? []
    : claims.items.filter((c) => team.includes(c.employee) && c.status === "Pending").sort((a, b) => a.submitted.localeCompare(b.submitted));
  const approved = claims.items.filter((c) => team.includes(c.employee) && c.status === "Approved").length;
  return (
    <Shell>
      <Heading id="heading.approvals" text="Approvals" />
      {state === "state.failed" && (
        <Alert id="alert.queue-failed" tone="error" title="Queue unavailable" text="Your team's claims could not be loaded. Try again in a few minutes." />
      )}
      <StatGroup>
        <Stat id="stat.waiting" label="Awaiting you" value={String(queue.length)} hint="claims to decide" icon="Inbox" tone="warning" />
        <Stat id="stat.approved" label="Approved" value={String(approved)} hint="from your team" icon="CircleCheck" tone="success" />
      </StatGroup>
      <Section id="section.queue" title="Team claims" count={queue.length} subtitle="Oldest first. Open a claim to see its items and receipts, or to reject it with a reason.">
        <Table
          id="table.queue"
          columns={["Employee", "Claim", "Submitted", { label: "Total", kind: "number" }, { label: "Status", kind: "status" }]}
          rows={queue.map((c) => ({
            id: `queue.${c.id}`,
            cells: [c.employee, c.number, c.submitted, fmt(totalOf(items.items, c.id))],
            status: { text: c.status, tone: statusTone(c.status) },
            to: "screen.review",
            params: { claim: c.id },
            actions: [{ id: `queue.${c.id}.approve`, label: "Approve", onPress: () => claims.update(c.id, { status: "Approved", decided: today }) }],
          }))}
          empty={<EmptyState id="empty.queue" title="Nothing to approve" text="New claims from your team appear here." />}
        />
      </Section>
    </Shell>
  );
}

function Review() {
  const { claim: id } = useParams();
  const state = useDisplayState();
  const navigate = useNav();
  const today = useToday();
  const claims = useCollection<Claim>("claims");
  const items = useCollection<Item>("items");
  const [rejecting, setRejecting] = useState(false);
  const claim = (id ? claims.get(id) : undefined)
    ?? claims.items.find((c) => team.includes(c.employee) && c.status === "Pending")
    ?? claims.items[0]!;
  const lines = items.items.filter((i) => i.claimId === claim.id);
  const decide = (status: string, reason: string) => {
    claims.update(claim.id, { status, decided: today, reason });
    navigate.go("screen.approvals");
  };
  return (
    <Shell>
      <Breadcrumbs id="crumbs.review" items={[{ id: "crumb.approvals", label: "Approvals", to: "screen.approvals" }, { id: "crumb.claim", label: claim.number }]} />
      <Heading id="heading.review" text={`Claim ${claim.number} from ${claim.employee}`} />
      <Detail
        id="detail.review"
        fields={[
          { label: "Employee", value: claim.employee },
          { label: "Status", value: claim.status },
          { label: "Submitted", value: claim.submitted || "Not submitted" },
          { label: "Total", value: fmt(totalOf(items.items, claim.id)) },
        ]}
      />
      <Section id="section.items" title="Line items" count={lines.length} subtitle="Receipts are shown by file name.">
        <Table id="table.items" columns={itemColumns} rows={itemRows(lines)} />
      </Section>
      {claim.status === "Pending" && (
        <>
          <Button id="btn.approve" label="Approve" emphasis="primary" onPress={() => decide("Approved", "")} />
          <Button id="btn.reject" label="Reject" emphasis="danger" onPress={() => setRejecting(true)} />
        </>
      )}
      <Dialog id="dialog.reject" title={`Reject claim ${claim.number}`} open={rejecting} onClose={() => setRejecting(false)}>
        <Form
          id="form.reject"
          onSubmit={(v) => { setRejecting(false); decide("Rejected", v.reason ?? ""); }}
          actions={<Button id="btn.reject.confirm" label="Reject claim" emphasis="danger" submit />}
        >
          <Field
            id="field.reason"
            name="reason"
            label="Reason"
            type="textarea"
            required
            error={state === "state.validation-error" ? "Give the employee a reason" : undefined}
          />
        </Form>
      </Dialog>
    </Shell>
  );
}

function PayrollExport() {
  const state = useDisplayState();
  const today = useToday();
  const claims = useCollection<Claim>("claims");
  const items = useCollection<Item>("items");
  const payouts = useCollection<Payout>("payouts");
  const [notice, setNotice] = useState<string | undefined>();
  const ready = state === "state.empty" ? [] : claims.items.filter((c) => c.status === "Approved" && c.exported === "");
  const readyTotal = ready.reduce((sum, c) => sum + totalOf(items.items, c.id), 0);
  const run = () => {
    if (state === "state.failed" || ready.length === 0) return;
    const exportId = payouts.create({ ran: today, count: ready.length, total: fmt(readyTotal) });
    ready.forEach((c) => claims.update(c.id, { exported: exportId }));
    setNotice(`payroll-export-${today}.csv downloaded with ${ready.length} claims.`);
  };
  return (
    <Shell>
      <Heading id="heading.export" text="Payroll export" />
      {state === "state.failed" && (
        <Alert id="alert.export-failed" tone="error" title="Export failed" text="Nothing was marked as exported. Try again in a few minutes." />
      )}
      {notice && <Alert id="alert.exported" tone="success" text={notice} />}
      <StatGroup>
        <Stat id="stat.ready" label="Ready to export" value={String(ready.length)} hint="approved claims" icon="Inbox" tone="warning" />
        <Stat id="stat.ready-total" label="Total" value={fmt(readyTotal)} hint="to be paid" icon="DollarSign" />
      </StatGroup>
      <Section
        id="section.ready"
        title="Approved claims waiting"
        count={ready.length}
        subtitle="Exporting includes every claim listed here and marks each as exported."
        actions={<Button id="btn.export" label="Export CSV" emphasis="primary" disabled={ready.length === 0} onPress={run} />}
      >
        <Table
          id="table.ready"
          columns={["Employee", "Claim", "Approved", { label: "Total", kind: "number" }]}
          rows={ready.map((c) => ({ id: `ready.${c.id}`, cells: [c.employee, c.number, c.decided, fmt(totalOf(items.items, c.id))] }))}
          empty={<EmptyState id="empty.ready" title="Nothing to export" text="Approved claims appear here until they are exported." />}
        />
      </Section>
      <Section id="section.past" title="Past exports" count={payouts.items.length}>
        <Table
          id="table.past"
          columns={["Run on", { label: "Claims", kind: "number" }, { label: "Total", kind: "number" }]}
          rows={payouts.items.map((p) => ({ id: `past.${p.id}`, cells: [p.ran, String(p.count), p.total], to: "screen.export-detail", params: { export: p.id } }))}
          empty={<EmptyState id="empty.past" title="No exports yet" text="Each export you run is kept here." />}
        />
      </Section>
    </Shell>
  );
}

function ExportDetail() {
  const { export: id } = useParams();
  const claims = useCollection<Claim>("claims");
  const items = useCollection<Item>("items");
  const payouts = useCollection<Payout>("payouts");
  const [notice, setNotice] = useState<string | undefined>();
  const payout = (id ? payouts.get(id) : undefined) ?? payouts.items[0]!;
  const included = claims.items.filter((c) => c.exported === payout.id);
  return (
    <Shell>
      <Breadcrumbs id="crumbs.export" items={[{ id: "crumb.export", label: "Payroll export", to: "screen.export" }, { id: "crumb.run", label: payout.ran }]} />
      <Heading id="heading.export-detail" text={`Export of ${payout.ran}`} />
      {notice && <Alert id="alert.downloaded" tone="success" text={notice} />}
      <Detail id="detail.export" fields={[{ label: "Run on", value: payout.ran }, { label: "Claims", value: String(payout.count) }, { label: "Total", value: payout.total }]} />
      <Section
        id="section.included"
        title="Claims in this export"
        count={included.length}
        actions={<Button id="btn.download" label="Download again" onPress={() => setNotice(`payroll-export-${payout.ran}.csv downloaded.`)} />}
      >
        <Table
          id="table.included"
          columns={["Employee", "Claim", "Approved", { label: "Total", kind: "number" }]}
          rows={included.map((c) => ({ id: `included.${c.id}`, cells: [c.employee, c.number, c.decided, fmt(totalOf(items.items, c.id))] }))}
        />
      </Section>
    </Shell>
  );
}

function People() {
  const state = useDisplayState();
  const directory = useCollection<Person>("people");
  const [error, setError] = useState<string | undefined>();
  const names = directory.items.map((p) => p.name);
  const issue = state === "state.validation-error" ? "An employee cannot be their own line manager." : error;
  const assign = (v: Record<string, string>) => {
    const person = directory.items.find((p) => p.name === v.employee);
    if (!person || !v.manager || v.manager === person.name) { setError("An employee cannot be their own line manager."); return; }
    setError(undefined);
    directory.update(person.id, { manager: v.manager });
  };
  return (
    <Shell>
      <Heading id="heading.people" text="People" />
      {issue && <ValidationSummary id="summary.people" issues={[issue]} />}
      <Section id="section.people" title="Employees" count={directory.items.length} subtitle="Employees appear here once they have signed in.">
        <Table
          id="table.people"
          columns={["Employee", "Line manager"]}
          rows={directory.items.map((p) => ({ id: `person.${p.id}`, cells: [p.name, p.manager || "Not assigned"] }))}
          empty={<EmptyState id="empty.people" title="Nobody yet" text="People appear after they sign in." />}
        />
      </Section>
      <Form id="form.assign" title="Assign a line manager" onSubmit={assign} actions={<Button id="btn.assign" label="Assign" emphasis="primary" submit />}>
        <Field id="field.employee" name="employee" label="Employee" type="select" options={names} required />
        <Field id="field.manager" name="manager" label="Line manager" type="select" options={names} required />
      </Form>
    </Shell>
  );
}

function Account() {
  const user = userFor(useRole());
  return (
    <Shell>
      <Heading id="heading.account" text="Account" />
      <Detail id="detail.account" fields={[{ label: "Name", value: user.name }, { label: "Email", value: user.email }]} />
    </Shell>
  );
}

function SignedOut() {
  return (
    <Screen>
      <Heading id="heading.signed-out" text="You are signed out" />
      <Button id="btn.sign-in" label="Sign in" emphasis="primary" to="screen.account" />
    </Screen>
  );
}

export default defineApp({
  screens: {
    "screen.my-claims": MyClaims,
    "screen.claim-form": ClaimForm,
    "screen.claim-detail": ClaimDetail,
    "screen.approvals": Approvals,
    "screen.review": Review,
    "screen.export": PayrollExport,
    "screen.export-detail": ExportDetail,
    "screen.people": People,
    "screen.account": Account,
    "screen.signed-out": SignedOut,
  },
  data: {
    claims: [
      { id: "claims-1042", number: "C-1042", employee: "Maya Fernando", status: "Pending", submitted: "2026-01-12", decided: "", reason: "", exported: "" },
      { id: "claims-1039", number: "C-1039", employee: "Maya Fernando", status: "Rejected", submitted: "2026-01-05", decided: "2026-01-06", reason: "The hotel receipt is missing. Attach it and resubmit.", exported: "" },
      { id: "claims-1027", number: "C-1027", employee: "Maya Fernando", status: "Approved", submitted: "2026-01-02", decided: "2026-01-04", reason: "", exported: "payouts-1" },
      { id: "claims-1033", number: "C-1033", employee: "Maya Fernando", status: "Approved", submitted: "2026-01-09", decided: "2026-01-10", reason: "", exported: "" },
      { id: "claims-1031", number: "C-1031", employee: "Ana Silva", status: "Approved", submitted: "2026-01-03", decided: "2026-01-05", reason: "", exported: "" },
      { id: "claims-1045", number: "C-1045", employee: "Ana Silva", status: "Pending", submitted: "2026-01-13", decided: "", reason: "", exported: "" },
      { id: "claims-1050", number: "C-1050", employee: "Ravi Perera", status: "Draft", submitted: "", decided: "", reason: "", exported: "" },
    ],
    items: [
      { id: "items-1", claimId: "claims-1042", date: "2026-01-10", category: "Travel", amount: 42, description: "Taxi to the airport", receipt: "taxi-0110.pdf" },
      { id: "items-2", claimId: "claims-1042", date: "2026-01-11", category: "Meals", amount: 18.2, description: "Team lunch", receipt: "" },
      { id: "items-3", claimId: "claims-1039", date: "2026-01-04", category: "Accommodation", amount: 148.2, description: "Hotel, one night", receipt: "" },
      { id: "items-4", claimId: "claims-1027", date: "2026-01-01", category: "Travel", amount: 86.4, description: "Train to Kandy", receipt: "train.pdf" },
      { id: "items-5", claimId: "claims-1033", date: "2026-01-08", category: "Meals", amount: 24, description: "Client dinner", receipt: "" },
      { id: "items-6", claimId: "claims-1033", date: "2026-01-08", category: "Supplies", amount: 31.6, description: "Printer paper", receipt: "paper.pdf" },
      { id: "items-7", claimId: "claims-1031", date: "2026-01-02", category: "Travel", amount: 62, description: "Fuel", receipt: "fuel.pdf" },
      { id: "items-8", claimId: "claims-1045", date: "2026-01-12", category: "Meals", amount: 22.5, description: "Workshop snacks", receipt: "" },
      { id: "items-9", claimId: "claims-1050", date: "2026-01-13", category: "Supplies", amount: 15, description: "Notebooks", receipt: "" },
    ],
    payouts: [{ id: "payouts-1", ran: "2026-01-05", count: 1, total: "$86.40" }],
    people: [
      { id: "people-1", name: "Maya Fernando", manager: "Ravi Perera" },
      { id: "people-2", name: "Ana Silva", manager: "Ravi Perera" },
      { id: "people-3", name: "Ravi Perera", manager: "" },
      { id: "people-4", name: "Tom Wijesinghe", manager: "" },
    ],
  },
});

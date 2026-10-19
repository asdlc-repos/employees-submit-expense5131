# Approvals

## Purpose

Managers review, approve or reject their team's submitted claims.

Needs: F1.

## User Stories

- F2.1 As a manager, I see my team's pending claims in one list, oldest first.
- F2.2 As a manager, I open a claim and see its line items and receipts.
- F2.3 As a manager, I approve a claim.
- F2.4 As a manager, I reject a claim with a reason.
- F2.5 As a manager, I am emailed when a claim from my team is submitted.
- F2.6 As an employee, I am emailed when my claim is approved or rejected.

## Decisions

- A claim is approved by the employee's line manager.
- A claim is approved or rejected as a whole.
- While a manager is away, their claims wait; there are no deputies.
- Notification is by email on submission and on decision, as part of this feature; transactional email is needed.
- A decided claim cannot be changed by the manager.

## Out of Scope

- Deputies or delegation while a manager is away.
- Approval chains beyond the line manager.
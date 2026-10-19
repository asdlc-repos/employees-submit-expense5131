# Approvals

## Purpose

Managers review, approve or reject their team's submitted claims.

Needs: F1.

## User Stories

- F2.1 As a manager, I see my team's pending claims in one list, oldest first.
- F2.2 As a manager, I open a claim and see its line items and receipt references.
- F2.3 As a manager, I approve a claim.
- F2.4 As a manager, I reject a claim with a reason.
- F2.7 As finance, I assign each employee's line manager. *assumed*

## Decisions

- A claim is approved by the employee's line manager.
- A claim is approved or rejected as a whole.
- While a manager is away, their claims wait; there are no deputies.
- A decided claim cannot be changed by the manager.
- There are no email notifications; managers find new claims in their list and employees see the decision on their claim.
- Finance assigns line managers on a People screen; an employee appears there once they have signed in. *assumed*
- A manager decides only claims of the people assigned to them, never their own; a manager's own claim goes to their own line manager. *assumed*
- A claim goes to the manager assigned when it was submitted; reassigning a manager later does not move claims already pending. *assumed*

## Out of Scope

- Deputies or delegation while a manager is away.
- Approval chains beyond the line manager.
- Email notifications.

## Retired

- F2.5 dropped
- F2.6 dropped
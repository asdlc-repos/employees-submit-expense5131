# Submit expenses

## Purpose

Employees create and submit expense claims for review and track their status.

## User Stories

- F1.1 As an employee, I create a claim made up of one or more line items, each with a date, category, amount and description.
- F1.2 As an employee, I attach a receipt to a line item.
- F1.3 As an employee, I am required to attach a receipt to any line item above the receipt threshold.
- F1.4 As an employee, I save a claim as a draft and submit it when it is ready.
- F1.5 As an employee, I see my claims and each one's status (draft, pending, approved, rejected, withdrawn).
- F1.6 As an employee, I edit or withdraw a claim while it is pending.
- F1.7 As an employee, I see the reason a claim was rejected and resubmit it after correcting it.

## Decisions

- A claim holds several line items and is approved or rejected as a whole.
- A receipt is required only for line items above $25.
- Details are entered manually; receipts are stored but not read automatically.
- Once a claim is approved, the employee can no longer edit or withdraw it.
- A claim needs at least one line item, and every line item amount is above zero. *assumed*
- An employee with no line manager assigned cannot submit a claim; they are told to ask Finance to assign one. *assumed*
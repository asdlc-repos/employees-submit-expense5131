# Expense Claims

## Problem Statement

Employees need to be reimbursed for business expenses, but claims, manager sign-off and the hand-off to payroll are handled by hand, which is slow and error-prone for everyone involved.

## Solution

A web product where employees submit expense claims, their managers approve or reject them, and finance exports approved claims to payroll as a downloadable file.

## Actors

- Employee — submits and tracks their own expense claims.
- Manager — reviews and decides on claims from their team.
- Finance — exports approved claims for payroll.

## Features

- F1 [Submit expenses](features/F1-submit-expenses.md)
- F2 [Approvals](features/F2-approvals.md)
- F3 [Payroll export](features/F3-payroll-export.md)

## Product-wide

See [Product-wide](product-wide.md).

## Out of Scope

- Automatic reading of receipts by an agent; employees enter claim details manually.
- Direct integration with a payroll system; export is a downloadable file.
- A separate Notifications feature.
- Email notifications of any kind; people check their claims in the app.
- Storing receipt files; a receipt is recorded as a reference only.
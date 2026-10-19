# Payroll export

## Purpose

Finance exports approved claims to payroll as a downloadable file.

Needs: F2.

## User Stories

- F3.1 As finance, I see the approved claims that have not yet been exported.
- F3.2 As finance, I export all approved, not-yet-exported claims as a CSV file I download.
- F3.3 As finance, I see which claims were included in each export and when it was run.
- F3.4 As finance, I download a past export again.

## Decisions

- The export is a CSV file with one row per claim: employee, claim ID, total, approval date.
- An export includes every approved claim not yet exported; each is marked exported afterwards and is not included again.
- Amounts in the file are in the company currency.
- Claims are exported only after manager approval; nothing else is exported.
- When no approved claim is waiting, finance cannot run an export and no empty file is produced. *assumed*

## Out of Scope

- Sending the file directly to a payroll system.
- Choosing individual claims or a date range for an export.
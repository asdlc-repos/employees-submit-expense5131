# Claim to payroll

An employee submits a claim with a receipt, the line manager approves it, and finance exports it to payroll.

```mermaid
sequenceDiagram
    actor Employee
    actor Manager
    actor Finance
    participant expense-webapp
    participant expense-api
    participant receipt-storage
    participant email-service

    Employee->>expense-webapp: add line items and receipts, submit
    expense-webapp->>expense-api: upload receipt, submit claim
    expense-api->>receipt-storage: store receipt file
    alt no line manager assigned or receipt missing
        expense-api-->>expense-webapp: refused
    else
        expense-api-->>expense-webapp: claim pending
        expense-api->>email-service: tell the manager a claim was submitted
    end
    Manager->>expense-webapp: open claim, approve or reject
    expense-webapp->>expense-api: decide claim
    expense-api->>email-service: tell the employee the decision
    Finance->>expense-webapp: export approved claims
    expense-webapp->>expense-api: create export
    expense-api-->>expense-webapp: CSV file, claims marked exported
```
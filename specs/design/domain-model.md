# Domain model

Employees submit claims made of line items with receipt references; each claim goes to the employee's line manager, and approved claims are gathered into payroll exports. Every action is written to an audit log.

```mermaid
erDiagram
    EMPLOYEE ||--o{ CLAIM : submits
    EMPLOYEE |o--o{ EMPLOYEE : "is line manager of"
    EMPLOYEE |o--o{ CLAIM : "decides as approver"
    CLAIM ||--|{ LINE_ITEM : contains
    EXPORT ||--o{ CLAIM : includes
    EMPLOYEE ||--o{ EXPORT : runs
    EMPLOYEE ||--o{ AUDIT_ENTRY : performs
    EMPLOYEE {
        string id PK
        string subject "identity subject of the signed-in user"
        string username
        string displayName
        string managerId FK "line manager, null until assigned"
    }
    CLAIM {
        string id PK
        string employeeId FK
        string approverId FK "manager at submission"
        string status "draft, pending, approved, rejected, withdrawn"
        int totalCents "sum of line items"
        datetime submittedAt
        datetime decidedAt
        string rejectionReason
        string exportId FK "null until exported"
    }
    LINE_ITEM {
        string id PK
        string claimId FK
        date expenseDate
        string category
        int amountCents
        string description
        string receiptReference "receipt file name; no file is kept"
    }
    EXPORT {
        string id PK
        string createdById FK
        datetime createdAt
        int claimCount
        int totalCents
    }
    AUDIT_ENTRY {
        string id PK
        string actorId FK
        string action "submitted, approved, rejected, edited, withdrawn, exported"
        string claimId
        string exportId
        datetime at
    }
```

Amounts are integers in cents in one company currency. No receipt files are stored; a line item holds only the receipt's file name.
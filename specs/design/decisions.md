# Technical decisions

- \[architecture\] One service holds claims, approvals, exports and the people list, and one web app serves all three roles. *assumed* (all)
- \[architecture\] Receipt files go to object storage; the database keeps only the object key and file details. *assumed* (F1, F2)
- \[data-model\] Amounts are whole cents; one company currency. *assumed* (F1, F3)
- \[data-model\] Employee records are created on a person's first request, keyed on the identity subject, and carry the username. *assumed* (all)
- \[security\] A "my" or "team" request finds its rows through the subject of the gateway's signed assertion, never through anything the client sends. *assumed* (F1, F2)
- \[security\] Finance sees claims only through the export queue and exports, so it holds no right to read every claim. *assumed* (F3)
- \[expense-api\] A receipt is an image or PDF up to 10 MB, uploaded as base64 in a JSON request and shown through a short-lived download link. *assumed* (F1, F2)
- \[expense-api\] An export marks its claims and records itself in one transaction, so two exports run together never share a claim. *assumed* (F3)
- \[expense-api\] A past export file is rebuilt from the claims linked to that export. *assumed* (F3)
- \[expense-api\] Each submission, decision, edit, withdrawal and export writes an audit entry in the same transaction. *assumed* (all)
- \[expense-api\] Notification emails are sent after the action commits. *assumed* (F2)
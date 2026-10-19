import ballerina/constraint;
import ballerina/http;

public type ErrorConflict record {|
    *http:Conflict;
    Error body;
|};

public type Error record {
    # HTTP or application error code
    int code;
    # short human-readable label
    string message;
    # detailed explanation
    string description?;
    # URI to documentation
    string moreInfo?;
};

public type LineItem record {
    string id;
    string expenseDate;
    "travel"|"meals"|"accommodation"|"supplies"|"other" category;
    # Amount in cents of the company currency, above zero
    int amountCents;
    string description;
    # The receipt's file name; no file is stored
    string? receiptReference?;
};

public type ErrorBadRequest record {|
    *http:BadRequest;
    Error body;
|};

public type ManagerAssignment record {
    # The new line manager, never the employee themselves; null clears it
    string? managerId;
};

public type ClaimOk record {|
    *http:Ok;
    Claim body;
|};

public type ClaimList record {
    # total matching items
    int count;
    # relative URI of the next page
    string? next?;
    # relative URI of the previous page
    string? previous?;
    Claim[] data;
};

public type Rejection record {
    # Shown to the employee
    @constraint:String {minLength: 1}
    string reason;
};

public type ErrorNotFound record {|
    *http:NotFound;
    Error body;
|};

public type PersonList record {
    int count;
    string? next?;
    string? previous?;
    Person[] data;
};

public type ExportList record {
    int count;
    string? next?;
    string? previous?;
    Export[] data;
};

public type Me record {
    string id;
    string username;
    string displayName;
    # The caller's line manager, null until Finance assigns one
    string? managerName?;
};

public type LineItemInput record {
    string expenseDate;
    "travel"|"meals"|"accommodation"|"supplies"|"other" category;
    # Cents, above zero; a receipt is required above 2500
    int amountCents;
    string description;
    # The receipt's file name; required when the amount is above 2500
    string? receiptReference?;
};

public type Export record {
    string id;
    string createdAt;
    string createdByName;
    int claimCount;
    int totalCents;
    # Present on a single export: the claims it includes
    Claim[] claims?;
};

public type Person record {
    string id;
    string username;
    string displayName;
    string? managerId?;
    string? managerName?;
};

public type Claim record {
    string id;
    # Human-readable claim number
    string number;
    string employeeName;
    "draft"|"pending"|"approved"|"rejected"|"withdrawn" status;
    # Sum of the line items, in cents
    int totalCents;
    string? submittedAt?;
    string? decidedAt?;
    string? rejectionReason?;
    string? exportedAt?;
    # Present on a single claim, left out of lists
    LineItem[] lineItems?;
};

public type ClaimInput record {
    # The claim's whole list of line items; it replaces the existing list
    LineItemInput[] lineItems;
};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    Error body;
|};

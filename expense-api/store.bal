import ballerina/http;
import ballerina/log;
import ballerina/sql;

type ClaimRow record {|
    string id;
    string number;
    string employeeName;
    string status;
    int totalCents;
    string? submittedAt;
    string? decidedAt;
    string? rejectionReason;
    string? exportedAt;
|};

type LineItemRow record {|
    string id;
    string expenseDate;
    string category;
    int amountCents;
    string description;
    string? receiptReference;
|};

type ExportRow record {|
    string id;
    string createdAt;
    string createdByName;
    int claimCount;
    int totalCents;
|};

const string TS_FORMAT = "YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"";

function claimSelect() returns sql:ParameterizedQuery {
    return `
        SELECT c.id, 'EXP-' || lpad(c.seq::text, 6, '0') AS number, e.display_name AS "employeeName",
               c.status, c.total_cents AS "totalCents",
               to_char(c.submitted_at AT TIME ZONE 'UTC', ${TS_FORMAT}) AS "submittedAt",
               to_char(c.decided_at AT TIME ZONE 'UTC', ${TS_FORMAT}) AS "decidedAt",
               c.rejection_reason AS "rejectionReason",
               to_char(x.created_at AT TIME ZONE 'UTC', ${TS_FORMAT}) AS "exportedAt"
        FROM claims c
        JOIN employees e ON e.id = c.employee_id
        LEFT JOIN exports x ON x.id = c.export_id `;
}

function toClaim(ClaimRow row, LineItem[]? items = ()) returns Claim|error {
    Claim claim = {
        id: row.id,
        number: row.number,
        employeeName: row.employeeName,
        status: check toStatus(row.status),
        totalCents: row.totalCents,
        submittedAt: row.submittedAt,
        decidedAt: row.decidedAt,
        rejectionReason: row.rejectionReason,
        exportedAt: row.exportedAt
    };
    if items is LineItem[] {
        claim.lineItems = items;
    }
    return claim;
}

function toStatus(string value) returns "draft"|"pending"|"approved"|"rejected"|"withdrawn"|error {
    if value == "draft" {
        return "draft";
    }
    if value == "pending" {
        return "pending";
    }
    if value == "approved" {
        return "approved";
    }
    if value == "rejected" {
        return "rejected";
    }
    if value == "withdrawn" {
        return "withdrawn";
    }
    return error("unknown status " + value);
}

function toCategory(string value) returns "travel"|"meals"|"accommodation"|"supplies"|"other"|error {
    if value == "travel" {
        return "travel";
    }
    if value == "meals" {
        return "meals";
    }
    if value == "accommodation" {
        return "accommodation";
    }
    if value == "supplies" {
        return "supplies";
    }
    if value == "other" {
        return "other";
    }
    return error("unknown category " + value);
}

function lineItemsOf(string claimId) returns LineItem[]|error {
    stream<LineItemRow, sql:Error?> rows = db->query(`
        SELECT id, to_char(expense_date, 'YYYY-MM-DD') AS "expenseDate", category,
               amount_cents AS "amountCents", description, receipt_reference AS "receiptReference"
        FROM line_items WHERE claim_id = ${claimId} ORDER BY position`);
    return from LineItemRow row in rows
        select {
            id: row.id,
            expenseDate: row.expenseDate,
            category: check toCategory(row.category),
            amountCents: row.amountCents,
            description: row.description,
            receiptReference: row.receiptReference
        };
}

function claimPage(sql:ParameterizedQuery whereClause, sql:ParameterizedQuery orderClause, int 'limit, int offset)
        returns [Claim[], int]|error {
    stream<ClaimRow, sql:Error?> rows = db->query(sql:queryConcat(claimSelect(), whereClause, orderClause,
            ` LIMIT ${'limit} OFFSET ${offset}`));
    Claim[] claims = check from ClaimRow row in rows
        select check toClaim(row);
    int total = check db->queryRow(sql:queryConcat(`SELECT count(*) FROM claims c `, whereClause));
    return [claims, total];
}

function oneClaim(sql:ParameterizedQuery whereClause) returns Claim|sql:NoRowsError|error {
    ClaimRow row = check db->queryRow(sql:queryConcat(claimSelect(), whereClause));
    return toClaim(row, check lineItemsOf(row.id));
}

function pageLinks(string path, string extraQuery, int 'limit, int offset, int total) returns [string?, string?] {
    string base = path + "?" + extraQuery + "limit=" + 'limit.toString() + "&offset=";
    string? next = offset + 'limit < total ? base + (offset + 'limit).toString() : ();
    string? previous = offset > 0 ? base + (offset - 'limit > 0 ? offset - 'limit : 0).toString() : ();
    return [next, previous];
}

function claimList(Claim[] data, int total, string path, string extraQuery, int 'limit, int offset) returns ClaimList {
    [string?, string?] [next, previous] = pageLinks(path, extraQuery, 'limit, offset, total);
    return {count: total, next, previous, data};
}

# Logs the failure and answers 500 with no detail (the error text can hold SQL).
#
# + operation - what was being done
# + err - the failure
# + return - the 500 to return as-is
function internalError(string operation, error err) returns http:InternalServerError {
    log:printError("request failed", operation = operation, 'error = err);
    return http:INTERNAL_SERVER_ERROR;
}

function notFound() returns ErrorNotFound {
    return {body: {code: 404, message: "Not found", description: "The record does not exist, or is not the caller's to see."}};
}

function badRequest(string description) returns ErrorBadRequest {
    return {body: {code: 400, message: "Bad request", description}};
}

function invalidPaging(int 'limit, int offset) returns ErrorBadRequest? {
    if 'limit < 1 || 'limit > 100 || offset < 0 {
        return badRequest("limit must be 1 to 100 and offset 0 or more");
    }
    return ();
}

function listExports(int 'limit, int offset) returns ExportList|error {
    stream<ExportRow, sql:Error?> rows = db->query(`
        SELECT x.id, to_char(x.created_at AT TIME ZONE 'UTC', ${TS_FORMAT}) AS "createdAt",
               e.display_name AS "createdByName", x.claim_count AS "claimCount", x.total_cents AS "totalCents"
        FROM exports x JOIN employees e ON e.id = x.created_by_id
        ORDER BY x.created_at DESC LIMIT ${'limit} OFFSET ${offset}`);
    Export[] data = check from ExportRow row in rows
        select {id: row.id, createdAt: row.createdAt, createdByName: row.createdByName,
            claimCount: row.claimCount, totalCents: row.totalCents};
    int total = check db->queryRow(`SELECT count(*) FROM exports`);
    [string?, string?] [next, previous] = pageLinks("/exports", "", 'limit, offset, total);
    return {count: total, next, previous, data};
}

function oneExport(string exportId) returns Export|sql:NoRowsError|error {
    ExportRow row = check db->queryRow(`
        SELECT x.id, to_char(x.created_at AT TIME ZONE 'UTC', ${TS_FORMAT}) AS "createdAt",
               e.display_name AS "createdByName", x.claim_count AS "claimCount", x.total_cents AS "totalCents"
        FROM exports x JOIN employees e ON e.id = x.created_by_id WHERE x.id = ${exportId}`);
    stream<ClaimRow, sql:Error?> rows = db->query(sql:queryConcat(claimSelect(),
            ` WHERE c.export_id = ${exportId} ORDER BY c.decided_at ASC`));
    Claim[] claims = check from ClaimRow claimRow in rows
        select check toClaim(claimRow);
    return {id: row.id, createdAt: row.createdAt, createdByName: row.createdByName,
        claimCount: row.claimCount, totalCents: row.totalCents, claims};
}

function listPeople(int 'limit, int offset) returns PersonList|error {
    stream<EmployeeRow, sql:Error?> rows = db->query(`
        SELECT e.id, e.username, e.display_name AS "displayName", e.manager_id AS "managerId",
               m.display_name AS "managerName"
        FROM employees e LEFT JOIN employees m ON m.id = e.manager_id
        ORDER BY e.display_name, e.id LIMIT ${'limit} OFFSET ${offset}`);
    Person[] data = check from EmployeeRow row in rows
        select {id: row.id, username: row.username, displayName: row.displayName,
            managerId: row.managerId, managerName: row.managerName};
    int total = check db->queryRow(`SELECT count(*) FROM employees`);
    [string?, string?] [next, previous] = pageLinks("/people", "", 'limit, offset, total);
    return {count: total, next, previous, data};
}

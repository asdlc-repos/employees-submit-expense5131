import ballerina/http;
import ballerina/sql;
import ballerina/uuid;

type EmployeeRow record {|
    string id;
    string username;
    string displayName;
    string? managerId;
    string? managerName;
|};

# The caller's employee row, created on the first request and keyed on the
# assertion's `sub`. The username is refreshed when the assertion carries one.
#
# + caller - the verified caller
# + return - the employee row
function ensureEmployee(GatewayCaller caller) returns EmployeeRow|error {
    string username = caller.username.trim() == "" ? caller.userId : caller.username.trim();
    sql:ExecutionResult _ = check db->execute(`
        INSERT INTO employees (id, subject, username, display_name)
        VALUES (${uuid:createRandomUuid()}, ${caller.userId}, ${username}, ${username})
        ON CONFLICT (subject) DO UPDATE
        SET username = CASE WHEN ${caller.username.trim()} <> '' THEN EXCLUDED.username ELSE employees.username END,
            display_name = CASE WHEN ${caller.username.trim()} <> '' THEN EXCLUDED.display_name ELSE employees.display_name END`);
    return db->queryRow(`
        SELECT e.id, e.username, e.display_name AS "displayName", e.manager_id AS "managerId",
               m.display_name AS "managerName"
        FROM employees e LEFT JOIN employees m ON m.id = e.manager_id
        WHERE e.subject = ${caller.userId}`);
}

# Resolves the verified caller to their employee row, or the HTTP answer to give.
#
# + ctx - the request context
# + return - the employee, a 401, or a 500
function resolveEmployee(http:RequestContext ctx) returns EmployeeRow|http:Unauthorized|http:InternalServerError {
    GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
    if caller is http:Unauthorized {
        return caller;
    }
    EmployeeRow|error row = ensureEmployee(caller);
    if row is error {
        return internalError("ensureEmployee", row);
    }
    return row;
}

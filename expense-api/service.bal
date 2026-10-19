import ballerina/http;
import ballerina/sql;

listener http:Listener ep0 = new (9090);

function notImplemented(string feature) returns http:NotImplemented {
    return {body: {code: 501, message: "Not implemented", description: feature + " is built by a later item"}};
}

service http:InterceptableService / on ep0 {

    public function createInterceptors() returns AssertionInterceptor => new;

    resource function get health() returns http:Ok {
        return http:OK;
    }

    resource function get me(http:RequestContext ctx) returns Me|ErrorUnauthorized|http:Unauthorized|http:InternalServerError {
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        return {id: employee.id, username: employee.username, displayName: employee.displayName,
            managerName: employee.managerName};
    }

    resource function get me/claims(http:RequestContext ctx, "draft"|"pending"|"approved"|"rejected"|"withdrawn"? status,
            int 'limit = 20, int offset = 0)
            returns ClaimList|ErrorBadRequest|http:Unauthorized|http:InternalServerError {
        ErrorBadRequest? invalid = invalidPaging('limit, offset);
        if invalid is ErrorBadRequest {
            return invalid;
        }
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        sql:ParameterizedQuery whereClause = `WHERE c.employee_id = ${employee.id}`;
        string extra = "";
        if status is string {
            whereClause = sql:queryConcat(whereClause, ` AND c.status = ${status}`);
            extra = "status=" + status + "&";
        }
        [Claim[], int]|error page = claimPage(whereClause, ` ORDER BY c.created_at DESC`, 'limit, offset);
        if page is error {
            return internalError("listMyClaims", page);
        }
        return claimList(page[0], page[1], "/me/claims", extra, 'limit, offset);
    }

    resource function post me/claims(http:RequestContext ctx, @http:Payload ClaimInput payload)
            returns Claim|ErrorBadRequest|http:Unauthorized|http:NotImplemented {
        return notImplemented("Creating a claim");
    }

    resource function get me/claims/[string claimId](http:RequestContext ctx)
            returns Claim|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        Claim|sql:NoRowsError|error claim = oneClaim(`WHERE c.id = ${claimId} AND c.employee_id = ${employee.id}`);
        if claim is sql:NoRowsError {
            return notFound();
        }
        if claim is error {
            return internalError("getMyClaim", claim);
        }
        return claim;
    }

    resource function put me/claims/[string claimId](http:RequestContext ctx, @http:Payload ClaimInput payload)
            returns Claim|ErrorBadRequest|ErrorNotFound|ErrorConflict|http:Unauthorized|http:NotImplemented {
        return notImplemented("Editing a claim");
    }

    resource function post me/claims/[string claimId]/submit(http:RequestContext ctx)
            returns ClaimOk|ErrorBadRequest|ErrorNotFound|ErrorConflict|http:Unauthorized|http:NotImplemented {
        return notImplemented("Submitting a claim");
    }

    resource function post me/claims/[string claimId]/withdraw(http:RequestContext ctx)
            returns ClaimOk|ErrorNotFound|ErrorConflict|http:Unauthorized|http:NotImplemented {
        return notImplemented("Withdrawing a claim");
    }

    resource function get me/team/claims(http:RequestContext ctx, "pending"|"approved"|"rejected" status = "pending",
            int 'limit = 20, int offset = 0)
            returns ClaimList|ErrorBadRequest|http:Unauthorized|http:InternalServerError {
        ErrorBadRequest? invalid = invalidPaging('limit, offset);
        if invalid is ErrorBadRequest {
            return invalid;
        }
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        sql:ParameterizedQuery whereClause = `WHERE e.manager_id = ${employee.id} AND c.status = ${status}`;
        [Claim[], int]|error page = claimPage(whereClause, ` ORDER BY c.submitted_at ASC`, 'limit, offset);
        if page is error {
            return internalError("listTeamClaims", page);
        }
        return claimList(page[0], page[1], "/me/team/claims", "status=" + status + "&", 'limit, offset);
    }

    resource function get me/team/claims/[string claimId](http:RequestContext ctx)
            returns Claim|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        Claim|sql:NoRowsError|error claim = oneClaim(
                `WHERE c.id = ${claimId} AND e.manager_id = ${employee.id} AND c.status <> 'draft'`);
        if claim is sql:NoRowsError {
            return notFound();
        }
        if claim is error {
            return internalError("getTeamClaim", claim);
        }
        return claim;
    }

    resource function post me/team/claims/[string claimId]/approve(http:RequestContext ctx)
            returns ClaimOk|ErrorNotFound|ErrorConflict|http:Unauthorized|http:NotImplemented {
        return notImplemented("Approving a claim");
    }

    resource function post me/team/claims/[string claimId]/reject(http:RequestContext ctx, @http:Payload Rejection payload)
            returns ClaimOk|ErrorBadRequest|ErrorNotFound|ErrorConflict|http:Unauthorized|http:NotImplemented {
        return notImplemented("Rejecting a claim");
    }

    resource function get export\-queue(http:RequestContext ctx, int 'limit = 20, int offset = 0)
            returns ClaimList|ErrorBadRequest|http:Unauthorized|http:InternalServerError {
        ErrorBadRequest? invalid = invalidPaging('limit, offset);
        if invalid is ErrorBadRequest {
            return invalid;
        }
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        [Claim[], int]|error page = claimPage(`WHERE c.status = 'approved' AND c.export_id IS NULL`,
                ` ORDER BY c.decided_at ASC`, 'limit, offset);
        if page is error {
            return internalError("listExportQueue", page);
        }
        return claimList(page[0], page[1], "/export-queue", "", 'limit, offset);
    }

    resource function get exports(http:RequestContext ctx, int 'limit = 20, int offset = 0)
            returns ExportList|ErrorBadRequest|http:Unauthorized|http:InternalServerError {
        ErrorBadRequest? invalid = invalidPaging('limit, offset);
        if invalid is ErrorBadRequest {
            return invalid;
        }
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        ExportList|error list = listExports('limit, offset);
        if list is error {
            return internalError("listExports", list);
        }
        return list;
    }

    resource function post exports(http:RequestContext ctx)
            returns Export|ErrorConflict|http:Unauthorized|http:NotImplemented {
        return notImplemented("Running an export");
    }

    resource function get exports/[string exportId](http:RequestContext ctx)
            returns Export|ErrorNotFound|http:Unauthorized|http:InternalServerError {
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        Export|sql:NoRowsError|error found = oneExport(exportId);
        if found is sql:NoRowsError {
            return notFound();
        }
        if found is error {
            return internalError("getExport", found);
        }
        return found;
    }

    resource function get exports/[string exportId]/file(http:RequestContext ctx)
            returns http:Response|ErrorNotFound|http:Unauthorized|http:NotImplemented {
        return notImplemented("The export file");
    }

    resource function get people(http:RequestContext ctx, int 'limit = 20, int offset = 0)
            returns PersonList|ErrorBadRequest|http:Unauthorized|http:InternalServerError {
        ErrorBadRequest? invalid = invalidPaging('limit, offset);
        if invalid is ErrorBadRequest {
            return invalid;
        }
        EmployeeRow|http:Unauthorized|http:InternalServerError employee = resolveEmployee(ctx);
        if employee !is EmployeeRow {
            return employee;
        }
        PersonList|error list = listPeople('limit, offset);
        if list is error {
            return internalError("listPeople", list);
        }
        return list;
    }

    resource function put people/[string personId]/manager(http:RequestContext ctx, @http:Payload ManagerAssignment payload)
            returns Person|ErrorBadRequest|ErrorNotFound|http:Unauthorized|http:NotImplemented {
        return notImplemented("Assigning a line manager");
    }
}

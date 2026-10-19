import ballerina/sql;
import ballerina/uuid;

# Appends one audit entry (P1). Call it INSIDE the `transaction` block that
# performs the submission, decision, edit, withdrawal or export, so the entry
# commits or rolls back with the change.
#
# + actorId - employee id of the person acting
# + action - submitted, approved, rejected, edited, withdrawn or exported
# + claimId - the claim concerned, if any
# + exportId - the export concerned, if any
# + return - an error when the insert fails
function writeAudit(string actorId, "submitted"|"approved"|"rejected"|"edited"|"withdrawn"|"exported" action,
        string? claimId = (), string? exportId = ()) returns error? {
    sql:ExecutionResult _ = check db->execute(`
        INSERT INTO audit_log (id, actor_id, action, claim_id, export_id)
        VALUES (${uuid:createRandomUuid()}, ${actorId}, ${action}, ${claimId}, ${exportId})`);
}

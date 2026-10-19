import ballerina/lang.'int as langint;
import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

final string dbHost = orDefault(dbHostEnv, "localhost");
final int dbPort = resolvePort(dbPortEnv);
final string dbName = orDefault(dbNameEnv, "appdb");
final string dbUser = orDefault(dbUserEnv, "postgres");

final postgresql:Client db = check new (dbHost, dbUser, dbPasswordEnv, dbName, dbPort);

// Schema is applied before the listener starts; a failure stops the service.
final () dbReady = check migrate();

function resolvePort(string raw) returns int {
    int|error parsed = langint:fromString(orDefault(raw, "5432"));
    return parsed is int ? parsed : 5432;
}

// Idempotent DDL, applied in order on every start. All amounts are integer cents.
function migrate() returns error? {
    sql:ParameterizedQuery[] statements = [
        `CREATE TABLE IF NOT EXISTS employees (
            id            TEXT PRIMARY KEY,
            subject       TEXT NOT NULL UNIQUE,
            username      TEXT NOT NULL,
            display_name  TEXT NOT NULL,
            manager_id    TEXT REFERENCES employees(id),
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT employees_not_own_manager CHECK (manager_id IS NULL OR manager_id <> id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id)`,
        `CREATE TABLE IF NOT EXISTS exports (
            id             TEXT PRIMARY KEY,
            created_by_id  TEXT NOT NULL REFERENCES employees(id),
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            claim_count    INTEGER NOT NULL CHECK (claim_count > 0),
            total_cents    BIGINT NOT NULL CHECK (total_cents >= 0)
        )`,
        `CREATE TABLE IF NOT EXISTS claims (
            id               TEXT PRIMARY KEY,
            seq              BIGINT GENERATED ALWAYS AS IDENTITY,
            employee_id      TEXT NOT NULL REFERENCES employees(id),
            approver_id      TEXT REFERENCES employees(id),
            status           TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','pending','approved','rejected','withdrawn')),
            total_cents      BIGINT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            submitted_at     TIMESTAMPTZ,
            decided_at       TIMESTAMPTZ,
            rejection_reason TEXT,
            export_id        TEXT REFERENCES exports(id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_claims_employee ON claims(employee_id, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_claims_approver ON claims(approver_id, status)`,
        `CREATE INDEX IF NOT EXISTS idx_claims_export_queue ON claims(status, export_id)`,
        `CREATE TABLE IF NOT EXISTS line_items (
            id                 TEXT PRIMARY KEY,
            claim_id           TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
            position           INTEGER NOT NULL,
            expense_date       DATE NOT NULL,
            category           TEXT NOT NULL
                               CHECK (category IN ('travel','meals','accommodation','supplies','other')),
            amount_cents       BIGINT NOT NULL CHECK (amount_cents > 0),
            description        TEXT NOT NULL,
            receipt_reference  TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_line_items_claim ON line_items(claim_id, position)`,
        `CREATE TABLE IF NOT EXISTS audit_log (
            id          TEXT PRIMARY KEY,
            actor_id    TEXT NOT NULL REFERENCES employees(id),
            action      TEXT NOT NULL
                        CHECK (action IN ('submitted','approved','rejected','edited','withdrawn','exported')),
            claim_id    TEXT,
            export_id   TEXT,
            at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_audit_claim ON audit_log(claim_id)`
    ];
    foreach sql:ParameterizedQuery statement in statements {
        sql:ExecutionResult _ = check db->execute(statement);
    }
    log:printInfo("database schema ready", host = dbHost, database = dbName);
}

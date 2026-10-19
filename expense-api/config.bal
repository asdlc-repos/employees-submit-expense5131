import ballerina/os;

configurable string dbHostEnv = os:getEnv("EXPENSE_DB_HOST");
configurable string dbPortEnv = os:getEnv("EXPENSE_DB_PORT");
configurable string dbNameEnv = os:getEnv("EXPENSE_DB_DBNAME");
configurable string dbUserEnv = os:getEnv("EXPENSE_DB_USER");
configurable string dbPasswordEnv = os:getEnv("EXPENSE_DB_PASSWORD");

# A configurable value, or its default when the environment left it empty.
#
# + value - the value read from the environment
# + fallback - the default
# + return - the value, or the default
function orDefault(string value, string fallback) returns string {
    return value.trim() == "" ? fallback : value.trim();
}

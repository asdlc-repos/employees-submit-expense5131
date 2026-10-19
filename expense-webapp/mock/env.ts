export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  // No USER_AUTH_JWKS_URL: the platform emits it, src/env.ts does not declare it.
  USER_AUTH_SCOPES:
    "openid profile email group ou claims:read claims:submit claims:review-team claims:approve claims:reject exports:read exports:create people:read people:manage",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/mock-project",
};

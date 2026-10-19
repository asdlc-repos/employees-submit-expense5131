import { useEffect, type JSX, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, Typography } from "@wso2/oxygen-ui";
import { AuthzProvider, Forbidden, NoAccess, RequireOperation, useAuthz, useScopes } from "./authz/gates";
import { SCREEN_ROUTES, hasScopedReach, reachableScreens } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppLayout } from "./shell/AppShell";
import { APP_NAME } from "./appName";
import { CallbackPage } from "./pages/Callback";
import { MyClaimsPage } from "./pages/MyClaims";
import { ClaimFormPage } from "./pages/ClaimForm";
import { ClaimDetailPage } from "./pages/ClaimDetail";
import { ApprovalsPage } from "./pages/Approvals";
import { ReviewPage } from "./pages/Review";
import { PayrollExportPage } from "./pages/PayrollExport";
import { ExportDetailPage } from "./pages/ExportDetail";
import { PeoplePage } from "./pages/People";
import { AccountPage } from "./pages/Account";
import { SignedOutPage } from "./pages/SignedOut";

/** Pages keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  "my-claims": <MyClaimsPage />,
  "claim-form": <ClaimFormPage />,
  "claim-detail": <ClaimDetailPage />,
  approvals: <ApprovalsPage />,
  review: <ReviewPage />,
  export: <PayrollExportPage />,
  "export-detail": <ExportDetailPage />,
  people: <PeoplePage />,
  account: <AccountPage />,
  "signed-out": <SignedOutPage />,
};

const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        {PUBLIC_SCREENS.map((screen) => (
          <Route
            key={screen.key}
            path={screen.path}
            element={<AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>}
          />
        ))}
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

// Hands src/authz/client.ts the route a refusal goes to, once, from inside the router.
function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): JSX.Element {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" component="h1">
        {APP_NAME}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Checking your session…
      </Typography>
    </Box>
  );
}

function SignedIn(): JSX.Element {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // Only a MISSING session starts a sign-in; an expired one was renewed silently.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  // NoAccess REPLACES the shell: no rail around "you have no access".
  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  const reachable = reachableScreens(scopes, signedIn);
  const landingScreen = reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0];
  // Optional-param paths ("/claim-form/:claim?") are never a landing screen,
  // but strip the param defensively.
  const landing = landingScreen.path.split("/:")[0];

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          if (screen.public) return null;
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route key={screen.key} element={<RequireOperation op={screen.loads} screen={screen.label} />}>
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        {/* Forbidden is INSIDE the shell: the rail the caller can use stays. */}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}

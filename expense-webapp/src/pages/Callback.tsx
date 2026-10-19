import { useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

// Finishes the OIDC redirect (or a silent renew) exactly once, then lands on
// the app root, which redirects to the first screen the caller can reach.
export function CallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void handleCallback().then(() => navigate("/", { replace: true }));
  }, [navigate]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="body1">Signing you in…</Typography>
    </Box>
  );
}

import type { JSX } from "react";
import { Box, Button, Stack, Typography } from "@wso2/oxygen-ui";
import { signIn } from "../authz/session";

export function SignedOutPage(): JSX.Element {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h4" component="h1">
          You are signed out
        </Typography>
        <Box>
          <Button variant="contained" onClick={() => void signIn()}>
            Sign in
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

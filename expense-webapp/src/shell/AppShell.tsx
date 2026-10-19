import { useEffect, useState, type JSX } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShell, ColorSchemeToggle, Divider, Footer, Header, Sidebar, UserMenu } from "@wso2/oxygen-ui";
import { Clock, FileText, Users, User, Wallet } from "@wso2/oxygen-ui-icons-react";
import { Can } from "../authz/gates";
import { SCREEN_ROUTES } from "../authz/screens";
import { currentUser, signOut } from "../authz/session";
import { APP_NAME } from "../appName";

// The rail: the prototype's `nav`, in order. Each item is gated on the
// operation its screen loads, read from SCREEN_ROUTES.
const NAV = [
  { key: "my-claims", icon: <FileText size={18} /> },
  { key: "approvals", icon: <Clock size={18} /> },
  { key: "export", icon: <Wallet size={18} /> },
  { key: "people", icon: <Users size={18} /> },
] as const;

function screen(key: string) {
  const found = SCREEN_ROUTES.find((s) => s.key === key);
  if (!found) throw new Error(`AppShell: no screen "${key}" in src/authz/screens.ts`);
  return found;
}

// "/claim-detail/:claim" belongs to the "My claims" rail item, and so on.
const RAIL_OF: Record<string, string> = {
  "claim-form": "my-claims",
  "claim-detail": "my-claims",
  review: "approvals",
  "export-detail": "export",
};

function activeKey(pathname: string): string {
  const hit = SCREEN_ROUTES.find((s) => pathname === s.path.split("/:")[0] || pathname.startsWith(`${s.path.split("/:")[0]}/`));
  return hit ? (RAIL_OF[hit.key] ?? hit.key) : "";
}

export function AppLayout(): JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [who, setWho] = useState({ name: "", email: "" });

  useEffect(() => {
    void currentUser().then((user) => {
      const profile = user?.profile;
      setWho({
        name: profile?.name ?? profile?.email ?? profile?.sub ?? "",
        email: profile?.email ?? "",
      });
    });
  }, []);

  return (
    <AppShell>
      <AppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={who.name || "Account"} />
              <UserMenu.Header name={who.name || "Account"} email={who.email} />
              <UserMenu.Item icon={<User size={18} />} label="Account" onClick={() => navigate(screen("account").path)} />
              <UserMenu.Divider />
              <UserMenu.Logout onClick={() => void signOut()} label="Sign out" />
            </UserMenu>
          </Header.Actions>
        </Header>
      </AppShell.Navbar>

      <AppShell.Sidebar>
        <Sidebar activeItem={activeKey(pathname)}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {NAV.map(({ key, icon }) => {
                const s = screen(key);
                return s.loads === null ? null : (
                  <Can key={key} op={s.loads}>
                    <Sidebar.Item id={key} link={<Link to={s.path} />}>
                      <Sidebar.ItemIcon>{icon}</Sidebar.ItemIcon>
                      <Sidebar.ItemLabel>{s.label}</Sidebar.ItemLabel>
                    </Sidebar.Item>
                  </Can>
                );
              })}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </AppShell.Sidebar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </AppShell.Footer>
    </AppShell>
  );
}

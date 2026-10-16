import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.ISPF_URL || "http://127.0.0.1:8080";
const username = process.env.ISPF_USER || "admin";
const password = process.env.ISPF_PASSWORD || "admin";
const dashboardPath =
  process.env.ISPF_DASHBOARD_PATH || "root.platform.dashboards.handler-demo-coordinates";

async function api(token, method, url, body) {
  const res = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${url} → ${res.status} ${text.slice(0, 800)}`);
  }
  return json;
}

async function main() {
  const snapshot = JSON.parse(
    readFileSync(join(here, "fixtures/handler-demo-coordinates.dashboard.json"), "utf8"),
  );
  const login = await api(null, "POST", "/api/v1/auth/login", { username, password, provider: "local" });
  const token = login.token ?? login.accessToken;
  if (!token) throw new Error("Login response has no token");

  let exists = true;
  try {
    await api(token, "GET", `/api/v1/objects/by-path?path=${encodeURIComponent(dashboardPath)}`);
  } catch {
    exists = false;
  }

  if (!exists) {
    await api(token, "POST", "/api/v1/objects", {
      parentPath: "root.platform.dashboards",
      name: "handler-demo-coordinates",
      type: "DASHBOARD",
      displayName: snapshot.title || "Handler demo — coordinates",
      description: "Spreadsheet over handler-demo-01 coordinates (platform user-work export)",
    });
    console.log(`Created dashboard object ${dashboardPath}`);
  }

  const layoutJson =
    typeof snapshot.layout === "string"
      ? snapshot.layout
      : JSON.stringify(snapshot.layout ?? snapshot.layoutJson ?? {});

  await api(
    token,
    "PUT",
    `/api/v1/dashboards/by-path/layout?path=${encodeURIComponent(dashboardPath)}`,
    { layoutJson },
  );

  if (snapshot.title) {
    await api(
      token,
      "PUT",
      `/api/v1/dashboards/by-path/title?path=${encodeURIComponent(dashboardPath)}`,
      { title: snapshot.title },
    );
  }

  if (snapshot.refreshIntervalMs != null) {
    await api(
      token,
      "PUT",
      `/api/v1/dashboards/by-path/refresh-interval?path=${encodeURIComponent(dashboardPath)}`,
      { refreshIntervalMs: snapshot.refreshIntervalMs },
    ).catch(() => {
      /* optional on older servers */
    });
  }

  console.log(`Applied layout to ${dashboardPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

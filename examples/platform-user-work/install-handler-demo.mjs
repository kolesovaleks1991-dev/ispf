/**
 * Recreate root.platform.devices.handler-demo-01 (virtual-lab-v1) if missing.
 */
const baseUrl = process.env.ISPF_URL || "http://127.0.0.1:8080";
const username = process.env.ISPF_USER || "admin";
const password = process.env.ISPF_PASSWORD || "admin";
const devicePath = process.env.ISPF_HANDLER_DEMO_PATH || "root.platform.devices.handler-demo-01";

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
  const login = await api(null, "POST", "/api/v1/auth/login", { username, password, provider: "local" });
  const token = login.token ?? login.accessToken;
  if (!token) throw new Error("Login response has no token");

  try {
    await api(token, "GET", `/api/v1/objects/by-path?path=${encodeURIComponent(devicePath)}`);
    console.log(`Already exists: ${devicePath}`);
    return;
  } catch {
    // create
  }

  const created = await api(token, "POST", "/api/v1/objects", {
    parentPath: "root.platform.devices",
    name: "handler-demo-01",
    type: "DEVICE",
    displayName: "Handler demo (API)",
    description: "Handler function demo (platform user-work example)",
    templateId: "virtual-lab-v1",
    driverId: "virtual",
    autoApplyMixinBlueprints: true,
  });
  console.log(`Created ${created.path ?? devicePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

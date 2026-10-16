import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const objectPath =
  process.env.ISPF_OBJECT_PATH || "root.platform.singleton-blueprints.test1";
const baseUrl = process.env.ISPF_URL || "http://127.0.0.1:8080";
const username = process.env.ISPF_USER || "admin";
const password = process.env.ISPF_PASSWORD || "admin";

const descriptor = JSON.parse(
  readFileSync(join(here, "getFamilies.descriptor.json"), "utf8"),
);

async function login() {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, provider: "local" }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  const body = await res.json();
  const token = body.token ?? body.accessToken;
  if (!token) {
    throw new Error("Login response has no token");
  }
  return token;
}

async function upsertFunction(token) {
  const url = new URL(`${baseUrl}/api/v1/objects/by-path/functions`);
  url.searchParams.set("path", objectPath);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(descriptor),
  });
  if (!res.ok) {
    throw new Error(`PUT getFamilies failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function invoke(token, row) {
  const url = new URL(`${baseUrl}/api/v1/objects/by-path/functions/invoke`);
  url.searchParams.set("path", objectPath);
  url.searchParams.set("name", descriptor.name);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      schema: descriptor.inputSchema,
      rows: [row],
    }),
  });
  if (!res.ok) {
    throw new Error(`Invoke failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

const token = await login();
const saved = await upsertFunction(token);
console.log(`Saved ${saved.name} on ${objectPath}`);

if (process.env.SKIP_INVOKE === "1") {
  console.log("SKIP_INVOKE=1 — smoke invoke skipped");
} else {
  try {
    const out = await invoke(token, { num: 5 });
    const row = out.rows?.[0];
    const list = row?.result;
    const count = Array.isArray(list) ? list.length : 0;
    console.log(`Invoke OK: error_code=${row?.error_code}, rows=${count}`);
    if (count > 0) {
      console.log("First row:", list[0]);
    }
  } catch (error) {
    console.warn(String(error.message));
    console.warn(
      "If SQL steps use an external data source, rebuild/restart ispf-server (FunctionScriptJdbcScope) and run again.",
    );
    process.exitCode = 1;
  }
}

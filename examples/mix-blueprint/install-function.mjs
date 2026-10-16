import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const objectPath =
  process.env.ISPF_OBJECT_PATH || "root.platform.mixin-blueprints.mix";
const baseUrl = process.env.ISPF_URL || "http://127.0.0.1:8080";
const username = process.env.ISPF_USER || "admin";
const password = process.env.ISPF_PASSWORD || "admin";

const descriptorFiles = [
  "evaluate-expression.descriptor.json",
  "evaluate-expression-cel.descriptor.json",
];

function loadDescriptor(fileName) {
  return JSON.parse(readFileSync(join(here, fileName), "utf8"));
}

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

async function upsertFunction(token, descriptor) {
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
    throw new Error(
      `PUT ${descriptor.name} failed (${res.status}): ${await res.text()}`,
    );
  }
  return res.json();
}

async function smokeInvoke(token, descriptor, row) {
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
    throw new Error(
      `Invoke ${descriptor.name} failed (${res.status}): ${await res.text()}`,
    );
  }
  return res.json();
}

const token = await login();
const descriptors = descriptorFiles.map(loadDescriptor);
const payload = { a: 10, b: 4, operator: "-" };

for (const descriptor of descriptors) {
  const saved = await upsertFunction(token, descriptor);
  console.log(`Saved function ${saved.name} on ${objectPath}`);
  const out = await smokeInvoke(token, descriptor, payload);
  console.log(`Smoke ${descriptor.name} 10 - 4:`, out.rows?.[0] ?? out);
}

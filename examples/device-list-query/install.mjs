import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.ISPF_URL || "http://127.0.0.1:8080";
const username = process.env.ISPF_USER || "admin";
const password = process.env.ISPF_PASSWORD || "admin";
const parentPath = process.env.ISPF_QUERIES_PARENT || "root.platform.queries";
const queryName = process.env.ISPF_QUERY_NAME || "device-list";
const objectPath = `${parentPath}.${queryName}`;

function loadDescriptor() {
  return JSON.parse(readFileSync(join(here, "run.descriptor.json"), "utf8"));
}

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

async function login() {
  const body = await api(null, "POST", "/api/v1/auth/login", { username, password, provider: "local" });
  const token = body.token ?? body.accessToken;
  if (!token) {
    throw new Error("Login response has no token");
  }
  return token;
}

async function ensureQueryObject(token) {
  try {
    await api(token, "GET", `/api/v1/objects/by-path?path=${encodeURIComponent(objectPath)}`);
    console.log(`Query object already exists: ${objectPath}`);
    return;
  } catch (error) {
    if (!String(error.message).includes("404")) {
      throw error;
    }
  }
  const created = await api(token, "POST", "/api/v1/objects", {
    parentPath,
    name: queryName,
    type: "CUSTOM",
    displayName: "Device list",
    description: "Object Query: all DEVICE nodes under root.platform.devices.*",
  });
  console.log(`Created query object: ${created.path ?? objectPath}`);
}

async function upsertRunFunction(token, descriptor) {
  await api(
    token,
    "PUT",
    `/api/v1/objects/by-path/functions?path=${encodeURIComponent(objectPath)}`,
    descriptor,
  );
  console.log(`Upserted function ${descriptor.name} on ${objectPath}`);
}

async function invokeRun(token, descriptor) {
  const out = await api(
    token,
    "POST",
    `/api/v1/objects/by-path/functions/invoke?path=${encodeURIComponent(objectPath)}&name=${encodeURIComponent(descriptor.name)}`,
    {
      schema: descriptor.inputSchema,
      rows: [{}],
    },
  );
  const row = out.rows?.[0] ?? out;
  const rowsJson = row.rows ?? row.result;
  const rowCount = row.rowCount ?? row.count;
  let parsed = [];
  if (typeof rowsJson === "string" && rowsJson.trim()) {
    parsed = JSON.parse(rowsJson);
  }
  console.log(`rowCount=${rowCount ?? parsed.length}`);
  console.log("sample rows:", parsed.slice(0, 5));
  return parsed;
}

const token = await login();
const descriptor = loadDescriptor();
await ensureQueryObject(token);
await upsertRunFunction(token, descriptor);
await invokeRun(token, descriptor);

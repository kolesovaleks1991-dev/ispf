import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = (process.env.CUTOFF_DIR || "C:/Users/1/Desktop/CutOff").replaceAll("\\", "/");
const baseUrl = process.env.ISPF_URL || "http://127.0.0.1:8080";
const username = process.env.ISPF_USER || "admin";
const password = process.env.ISPF_PASSWORD || "admin";

function parseFileName(name) {
  const match = /^(\d{8})\s+(\d+)\s+(\d+)\.csv$/i.exec(name);
  if (!match) {
    return { measuredDate: "", series: "", seq: "" };
  }
  return {
    measuredDate: `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`,
    series: match[2],
    seq: match[3],
  };
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlText(value) {
  if (value == null || String(value).trim() === "") {
    return "NULL";
  }
  return sqlLiteral(value);
}

function listFiles() {
  return readdirSync(sourceDir)
    .filter((name) => name.toLowerCase().endsWith(".csv") && !name.startsWith("_"))
    .sort()
    .map((fileName) => ({
      fileName,
      ...parseFileName(fileName),
      sourcePath: `${sourceDir}/${fileName}`,
    }));
}

async function api(token, method, url, body) {
  const res = await fetch(baseUrl + url, {
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
  if (!existsSync(sourceDir)) {
    throw new Error(`Catalog not found: ${sourceDir}`);
  }
  const files = listFiles();
  const bundle = JSON.parse(readFileSync(join(here, "bundle.json"), "utf8"));
  const login = await api(null, "POST", "/api/v1/auth/login", { username, password });
  const token = login.token;

  for (const path of ["root.platform.devices.cutoff", "root.platform.dashboards.cutoff-devices"]) {
    try {
      await api(token, "DELETE", `/api/v1/objects/by-path?path=${encodeURIComponent(path)}`);
      console.log(`Removed ${path}`);
    } catch (error) {
      if (!String(error.message).includes("404")) {
        console.warn(String(error.message));
      }
    }
  }

  const deploy = await api(token, "POST", "/api/v1/applications/cutoff/deploy", bundle);
  if (deploy.errors?.length) {
    throw new Error(`Deploy failed: ${JSON.stringify(deploy.errors)}`);
  }
  console.log(`Deployed viewer (${deploy.applied?.length || 0} steps)`);

  const seedSql = [
    "DROP TABLE IF EXISTS co_preview;",
    "DROP TABLE IF EXISTS co_open;",
    "DROP TABLE IF EXISTS co_file;",
    `CREATE TABLE co_file (
  file_name VARCHAR(255) PRIMARY KEY,
  measured_date VARCHAR(16),
  series VARCHAR(32),
  seq VARCHAR(16),
  source_path VARCHAR(1024) NOT NULL
);`,
    `CREATE TABLE co_open (
  id INTEGER PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  source_path VARCHAR(1024) NOT NULL
);`,
    `CREATE TABLE co_preview (
  sample_time VARCHAR(32),
  channel_a VARCHAR(64),
  step_value VARCHAR(64),
  channel_b VARCHAR(64),
  flag_value VARCHAR(64)
);`,
    ...files.map(
      (file) =>
        `INSERT INTO co_file (file_name, measured_date, series, seq, source_path) VALUES (${sqlLiteral(file.fileName)}, ${sqlText(file.measuredDate)}, ${sqlText(file.series)}, ${sqlText(file.seq)}, ${sqlLiteral(file.sourcePath)});`
    ),
  ].join("\n");

  await api(token, "POST", "/api/v1/applications/cutoff/data/migrate", {
    version: "1.1.0",
    scripts: [{ id: "cutoff_index_v11", sql: seedSql }],
  });
  console.log(`Indexed ${files.length} file names`);

  const list = await api(
    token,
    "POST",
    "/api/v1/reports/by-path/run?path=" + encodeURIComponent("root.platform.reports.cutoff-files"),
    { parameters: {} }
  );
  const listed = list.rows || list.result || [];
  const firstName = files[0]?.fileName;
  if (firstName) {
    await api(
      token,
      "POST",
      "/api/v1/objects/by-path/functions/invoke?path=" +
        encodeURIComponent("root.platform.singleton-blueprints.cutoff-hub-v1") +
        "&name=co_openFile",
      {
        schema: { name: "in", fields: [{ name: "file_name", type: "STRING" }] },
        rows: [{ file_name: firstName }],
      }
    );
  }
  const opened = await api(
    token,
    "POST",
    "/api/v1/reports/by-path/run?path=" + encodeURIComponent("root.platform.reports.cutoff-samples"),
    { parameters: {} }
  );
  const openedRows = opened.rows || opened.result || [];
  console.log(`List ${Array.isArray(listed) ? listed.length : "?"} files; opened ${firstName}: ${Array.isArray(openedRows) ? openedRows.length : "?"} rows`);
  console.log("http://127.0.0.1:5173/?mode=operator&app=cutoff");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

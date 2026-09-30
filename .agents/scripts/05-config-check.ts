// Read-only linked Clerk checks. Provider responses remain in memory.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const cwd = resolve(import.meta.dir, "../../apps/web");
function read(args: string[]): Record<string, unknown> {
  const output = execFileSync("clerk", args, { cwd, windowsHide: true, stdio: "pipe", encoding: "utf8" });
  return JSON.parse(output) as Record<string, unknown>;
}
const config = read(["config", "pull", "--instance", "dev"]);
console.log(JSON.stringify({ check: "clerk config pull --instance dev", sections: Object.keys(config) }));
const settings = read(["api", "/instance/oauth_application_settings", "--instance", "dev"]);
const fields = ["dynamic_oauth_client_registration", "default_scopes", "oauth_jwt_access_tokens", "aud_claim_enabled", "pkce_required", "client_id_metadata_documents_advertised", "client_id_metadata_documents_only_allow_pre_registered_clients"];
console.log(JSON.stringify({ check: "OAuth settings", settings: Object.fromEntries(fields.map(key => [key, settings[key]])) }));
const apps = read(["api", "/oauth_applications", "--instance", "dev"]);
console.log(JSON.stringify({ check: "OAuth applications", total: apps.total_count, listed: Array.isArray(apps.data) ? apps.data.length : 0 }));
const metadata = read(["api", "--fapi", "/.well-known/oauth-authorization-server", "--instance", "dev"]);
console.log(JSON.stringify({ check: "Authorization metadata", scopes: metadata.scopes_supported, cimd: metadata.client_id_metadata_document_supported ?? false, dcr: typeof metadata.registration_endpoint === "string" }));
const users = read(["api", "/users?query=kriyan-brief05-", "--instance", "dev"]);
console.log(JSON.stringify({ check: "Disposable identity cleanup", remaining: Array.isArray(users) ? users.length : Array.isArray(users.data) ? users.data.length : "unavailable" }));

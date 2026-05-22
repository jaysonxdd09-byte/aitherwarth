/**
 * One-time PocketBase setup: applied_capes collection + user cape fields.
 *
 * Usage (PocketBase must be running):
 *   PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=secret node scripts/setup-pocketbase.mjs
 */
import PocketBase from "pocketbase";

const PB_URL = process.env.PB_URL ?? process.env.VITE_PB_URL ?? "http://127.0.0.1:8090";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL ?? process.env.VITE_PB_ADMIN_EMAIL ?? "";
const PB_ADMIN_PASSWORD =
  process.env.PB_ADMIN_PASSWORD ?? process.env.VITE_PB_ADMIN_PASSWORD ?? "";

if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
  console.error(
    "Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (or VITE_PB_* equivalents) to your PocketBase superuser.",
  );
  process.exit(1);
}

const pb = new PocketBase(PB_URL);

async function ensureAppliedCapesCollection() {
  try {
    await pb.collections.getOne("applied_capes");
    console.log("Collection applied_capes already exists.");
    return;
  } catch {
    /* create below */
  }

  await pb.collections.create({
    name: "applied_capes",
    type: "base",
    fields: [
      { name: "username", type: "text", required: true },
      { name: "texture_url", type: "url", required: true },
      { name: "cape_name", type: "text", required: false },
      { name: "cape_category", type: "text", required: false },
      { name: "applied_at", type: "date", required: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_applied_capes_username ON applied_capes (username)',
    ],
    listRule: 'username != ""',
    viewRule: 'username != ""',
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  console.log("Created collection applied_capes.");
}

async function ensureUserCapeFields() {
  const users = await pb.collections.getOne("users");
  const names = new Set(users.fields.map((f) => f.name));
  const toAdd = [];

  if (!names.has("minecraft_ign")) {
    toAdd.push({ name: "minecraft_ign", type: "text", required: false });
  }
  if (!names.has("applied_texture_url")) {
    toAdd.push({ name: "applied_texture_url", type: "url", required: false });
  }
  if (!names.has("applied_cape_name")) {
    toAdd.push({ name: "applied_cape_name", type: "text", required: false });
  }
  if (!names.has("applied_cape_category")) {
    toAdd.push({ name: "applied_cape_category", type: "text", required: false });
  }

  if (toAdd.length === 0) {
    console.log("User cape fields already present.");
    return;
  }

  try {
    await pb.collections.update(users.id, {
      fields: [...users.fields, ...toAdd],
    });
    console.log("Added user fields:", toAdd.map((f) => f.name).join(", "));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate column")) {
      console.log("User cape fields already exist in database.");
      return;
    }
    throw e;
  }
}

async function ensureMailAndAppUrl() {
  const appUrl = process.env.VITE_APP_URL ?? process.env.APP_URL ?? "http://localhost:8080";
  const smtpHost = process.env.SMTP_HOST ?? "";
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USERNAME ?? process.env.SMTP_USER ?? "";
  const smtpPass = process.env.SMTP_PASSWORD ?? "";
  const smtpFrom = process.env.SMTP_FROM ?? smtpUser;

  const patch = {
    meta: {
      appName: "AitherWarth",
      appUrl: appUrl.replace(/\/$/, ""),
    },
  };

  if (smtpHost && smtpUser && smtpPass) {
    patch.smtp = {
      enabled: true,
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
      authMethod: "PLAIN",
      tls: smtpPort === 465,
      localName: "aitherwarth",
    };
    if (smtpFrom) {
      patch.meta.senderName = "AitherWarth";
      patch.meta.senderAddress = smtpFrom;
    }
    console.log(`SMTP enabled (${smtpHost}:${smtpPort}) — reset & verification emails will send.`);
  } else {
    console.log(
      "SMTP not configured — set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD (and optional SMTP_FROM) in .env.local, then re-run setup:pb.",
    );
  }

  await pb.settings.update(patch);
  console.log(`App URL for password reset links: ${patch.meta.appUrl}/reset-password`);
}

async function backfillNormalizedIgn() {
  const users = await pb.collection("users").getFullList({ fields: "id,minecraft_ign,minecraft_ign_normalized" });
  let updated = 0;
  for (const u of users) {
    const ign = (u.minecraft_ign || u.username || "").trim();
    if (!ign) continue;
    const key = ign.toLowerCase();
    if (u.minecraft_ign_normalized === key) continue;
    await pb.collection("users").update(u.id, { minecraft_ign_normalized: key });
    updated++;
  }
  if (updated > 0) console.log(`Backfilled minecraft_ign_normalized for ${updated} user(s).`);
}

async function main() {
  await pb.collection("_superusers").authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  await ensureAppliedCapesCollection();
  await ensureUserCapeFields();
  await ensureMailAndAppUrl();
  await backfillNormalizedIgn();
  console.log("PocketBase setup complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/* Local helper — confirms the OWNER can write to Firebase.
 * Your password stays on your machine; it is never sent to anyone but Google/Firebase.
 *
 *   node verify-owner-write.js "your-password"
 *
 * Expected: "Login OK" then "Owner WRITE -> PASS".  (Safe: it writes a temp key and deletes it.)
 */
const API_KEY = "AIzaSyBlgXLsJO9a8RGwV-DeqaGsYJngJsrGCOI";
const EMAIL   = "srrgkenterprises@gmail.com";
const DB      = "https://svlb-shop-default-rtdb.asia-southeast1.firebasedatabase.app";

const pw = process.argv[2];
if (!pw) { console.error('Usage: node verify-owner-write.js "<your-password>"'); process.exit(1); }

(async () => {
  try {
    const a = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: pw, returnSecureToken: true })
    });
    const auth = await a.json();
    if (!auth.idToken) { console.error("LOGIN FAILED:", auth.error && auth.error.message); process.exit(1); }
    console.log("Login OK as", EMAIL);

    const w = await fetch(`${DB}/catalog/_healthcheck.json?auth=${auth.idToken}`, {
      method: "PUT", body: JSON.stringify({ ok: true })
    });
    console.log("Owner WRITE ->", w.status === 200 ? "PASS ✅" : "FAIL (HTTP " + w.status + ")");

    await fetch(`${DB}/catalog/_healthcheck.json?auth=${auth.idToken}`, { method: "DELETE" });
    console.log("cleaned up the temp key. Done.");
  } catch (e) { console.error("ERROR:", e.message); process.exit(1); }
})();

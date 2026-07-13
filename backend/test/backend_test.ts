import { query, pool } from "../src/config/db";
import { PORT } from "../src/config/env";

const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${PORT}`;

async function runTests() {
  console.log("=== STARTING BACKEND INTEGRATION TESTS ===");

  // 1. Database Cleanup before test
  console.log("[DB] Cleaning up previous test data if any...");
  await query("DELETE FROM users WHERE email IN ($1, $2)", [
    "test-user-a@collabdocs.com",
    "test-user-b@collabdocs.com",
  ]);
  console.log("[DB] Cleanup complete.");

  let tokenA = "";
  let tokenB = "";
  let userIdA = "";
  let userIdB = "";
  let docId = "";
  let inviteToken = "";
  let requestId = "";

  // 2. Register Test User A
  console.log("\n[Test 1] Registering User A...");
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test-user-a@collabdocs.com",
      password: "password123",
      name: "User A",
    }),
  });
  if (regARes.status !== 201) {
    throw new Error(`Failed to register User A: ${regARes.status} ${await regARes.text()}`);
  }
  const regAData: any = await regARes.json();
  userIdA = regAData.user.id;
  console.log("  => User A registered successfully. ID:", userIdA);

  // 3. Register Test User B
  console.log("\n[Test 2] Registering User B...");
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test-user-b@collabdocs.com",
      password: "password123",
      name: "User B",
    }),
  });
  if (regBRes.status !== 201) {
    throw new Error(`Failed to register User B: ${regBRes.status} ${await regBRes.text()}`);
  }
  const regBData: any = await regBRes.json();
  userIdB = regBData.user.id;
  console.log("  => User B registered successfully. ID:", userIdB);

  // 4. Login User A
  console.log("\n[Test 3] Logging in User A...");
  const loginARes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test-user-a@collabdocs.com",
      password: "password123",
    }),
  });
  const loginAData: any = await loginARes.json();
  tokenA = loginAData.token;
  console.log("  => User A logged in successfully. Token length:", tokenA.length);

  // 5. Login User B
  console.log("\n[Test 4] Logging in User B...");
  const loginBRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test-user-b@collabdocs.com",
      password: "password123",
    }),
  });
  const loginBData: any = await loginBRes.json();
  tokenB = loginBData.token;
  console.log("  => User B logged in successfully. Token length:", tokenB.length);

  // 6. User A creates a document
  console.log("\n[Test 5] User A creating a document...");
  const createDocRes = await fetch(`${BASE_URL}/api/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ title: "Integration Test Document" }),
  });
  const docData: any = await createDocRes.json();
  docId = docData.id;
  console.log("  => Document created successfully. ID:", docId);

  // 7. Verify document listing segregation
  console.log("\n[Test 6] Verifying document listing segregation...");
  // User A gets their documents
  const docsARes = await fetch(`${BASE_URL}/api/documents`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const docsA: any = await docsARes.json();
  if (docsA.length !== 1 || docsA[0].id !== docId) {
    throw new Error(`User A document list mismatch! Expected 1 doc, got: ${JSON.stringify(docsA)}`);
  }
  console.log("  => Verified User A sees their owned document.");

  // User B gets their documents (should be empty because they don't own any)
  const docsBRes = await fetch(`${BASE_URL}/api/documents`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const docsB: any = await docsBRes.json();
  if (docsB.length !== 0) {
    throw new Error(`User B document list leak! Expected 0 docs, got: ${JSON.stringify(docsB)}`);
  }
  console.log("  => Verified User B does NOT see User A's document (clean separation).");

  // 8. User A generates a Viewer Invite Link
  console.log("\n[Test 7] User A generating Viewer Invite Link...");
  const shareRes = await fetch(`${BASE_URL}/api/documents/${docId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ permission: "viewer" }),
  });
  const shareData: any = await shareRes.json();
  inviteToken = shareData.token;
  if (!inviteToken) {
    throw new Error(`Failed to generate invite token! Response: ${JSON.stringify(shareData)}`);
  }
  console.log("  => Viewer invite token generated successfully:", inviteToken);

  // 9. User B redeems invite token
  console.log("\n[Test 8] User B redeeming Viewer Invite Link...");
  const redeemRes = await fetch(`${BASE_URL}/api/documents/${docId}/redeem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ token: inviteToken }),
  });
  const redeemData: any = await redeemRes.json();
  if (!redeemRes.ok || redeemData.permission !== "viewer") {
    throw new Error(`Failed to redeem invite! Status: ${redeemRes.status}, data: ${JSON.stringify(redeemData)}`);
  }
  console.log("  => Invite redeemed successfully. Permission:", redeemData.permission);

  // 10. Verify User B can see document under shared-with-me
  console.log("\n[Test 9] Verifying shared-with-me visibility...");
  const sharedDocsRes = await fetch(`${BASE_URL}/api/documents/shared-with-me`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const sharedDocs: any = await sharedDocsRes.json();
  if (sharedDocs.length !== 1 || sharedDocs[0].id !== docId) {
    throw new Error(`User B shared-with-me mismatch! Expected doc ${docId}, got: ${JSON.stringify(sharedDocs)}`);
  }
  console.log("  => Verified User B sees document under shared-with-me.");

  // 11. Verify User B is viewer (GET /api/documents/:id/access)
  console.log("\n[Test 10] Verifying User B's access details...");
  const accessRes = await fetch(`${BASE_URL}/api/documents/${docId}/access`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const accessData: any = await accessRes.json();
  if (accessData.permission !== "viewer") {
    throw new Error(`User B access mismatch! Expected permission 'viewer', got: ${JSON.stringify(accessData)}`);
  }
  console.log("  => Verified User B's role is 'viewer'.");

  // 12. User B requests Edit Access (Editor)
  console.log("\n[Test 11] User B requesting edit access...");
  const reqAccessRes = await fetch(`${BASE_URL}/api/documents/${docId}/request-access`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const reqAccessData: any = await reqAccessRes.json();
  if (reqAccessRes.status !== 201 || reqAccessData.status !== "REQUEST_CREATED") {
    throw new Error(`Failed to request access! Status: ${reqAccessRes.status}, data: ${JSON.stringify(reqAccessData)}`);
  }
  console.log("  => Request access submitted successfully. Status:", reqAccessData.status);

  // 13. Verify duplicate request prevention
  console.log("\n[Test 12] Verifying duplicate pending request prevention...");
  const dupeReqRes = await fetch(`${BASE_URL}/api/documents/${docId}/request-access`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const dupeReqData: any = await dupeReqRes.json();
  if (dupeReqRes.status !== 409 || dupeReqData.error !== "already_pending") {
    throw new Error(`Duplicate request not blocked! Status: ${dupeReqRes.status}, data: ${JSON.stringify(dupeReqData)}`);
  }
  console.log("  => Verified duplicate pending request blocked with 409 'already_pending'.");

  // 14. User A gets pending requests
  console.log("\n[Test 13] User A fetching pending requests...");
  const pendingRequestsRes = await fetch(`${BASE_URL}/api/documents/access-requests`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const pendingRequests: any = await pendingRequestsRes.json();
  if (pendingRequests.length !== 1 || pendingRequests[0].documentId !== docId || pendingRequests[0].requestedBy !== userIdB) {
    throw new Error(`Pending requests list mismatch! Got: ${JSON.stringify(pendingRequests)}`);
  }
  requestId = pendingRequests[0].id;
  console.log("  => Retrieved pending request ID:", requestId);

  // 15. User A approves request
  console.log("\n[Test 14] User A approving edit request...");
  const approveRes = await fetch(`${BASE_URL}/api/documents/${docId}/approve-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      requestId,
      userId: userIdB,
    }),
  });
  if (approveRes.status !== 200) {
    throw new Error(`Failed to approve request! Status: ${approveRes.status}, data: ${await approveRes.text()}`);
  }
  console.log("  => Request approved successfully.");

  // 16. Verify User B is upgraded to editor
  console.log("\n[Test 15] Verifying User B is upgraded to editor...");
  const accessUpgradeRes = await fetch(`${BASE_URL}/api/documents/${docId}/access`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const accessUpgradeData: any = await accessUpgradeRes.json();
  if (accessUpgradeData.permission !== "editor") {
    throw new Error(`User B's role was not upgraded! Got: ${JSON.stringify(accessUpgradeData)}`);
  }
  console.log("  => Verified User B's role is upgraded to 'editor' successfully.");

  // 17. Verify allow_editor_sharing constraints
  console.log("\n[Test 16] Verifying allow_editor_sharing constraints...");

  // As editor, with allow_editor_sharing = false (default), User B tries to share
  console.log("  - User B tries to share with allow_editor_sharing = false...");
  const editorShareFailRes = await fetch(`${BASE_URL}/api/documents/${docId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ permission: "viewer" }),
  });
  if (editorShareFailRes.status !== 403) {
    throw new Error(`Editor sharing not blocked when disabled! Status: ${editorShareFailRes.status}`);
  }
  console.log("    => Verified sharing blocked with 403.");

  // Owner User A toggles allow_editor_sharing = true
  console.log("  - User A toggles allow_editor_sharing = true...");
  const toggleRes = await fetch(`${BASE_URL}/api/documents/${docId}/toggle-editor-sharing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ allowEditorSharing: true }),
  });
  if (toggleRes.status !== 200) {
    throw new Error(`Failed to toggle editor sharing! Status: ${toggleRes.status}`);
  }
  console.log("    => Toggled successfully.");

  // User B tries to share again
  console.log("  - User B tries to share with allow_editor_sharing = true...");
  const editorShareSuccessRes = await fetch(`${BASE_URL}/api/documents/${docId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ permission: "viewer" }),
  });
  const editorShareSuccessData: any = await editorShareSuccessRes.json();
  if (editorShareSuccessRes.status !== 200 || !editorShareSuccessData.token) {
    throw new Error(`Editor sharing failed when enabled! Status: ${editorShareSuccessRes.status}, data: ${JSON.stringify(editorShareSuccessData)}`);
  }
  console.log("    => Share successful. Generated token:", editorShareSuccessData.token);

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

runTests()
  .catch((err) => {
    console.error("\n!!! INTEGRATION TEST FAILED !!!");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    // 18. Cleanup at the end
    console.log("\n[Cleanup] Cleaning up test database users and documents...");
    await query("DELETE FROM users WHERE email IN ($1, $2)", [
      "test-user-a@collabdocs.com",
      "test-user-b@collabdocs.com",
    ]);
    console.log("[Cleanup] Database clean.");
    await pool.end();
    console.log("[Cleanup] Pool closed. Exiting test.");
  });

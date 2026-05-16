// firebase_functions/index.js
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

const VALID_ROLES = ["admin", "bookkeeper", "client-staff"];
const db = admin.firestore();

async function getUserRole(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data().role?.toLowerCase() : null;
}

async function assertAdmin(context) {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to perform this action."
    );
  }

  const role = await getUserRole(context.auth.uid);
  if (role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can perform this action."
    );
  }
}

exports.createUserDoc = functions.auth.user().onCreate(async (user) => {
  const userRef = db.collection("users").doc(user.uid);
  const existingSnap = await userRef.get();
  const existingUser = existingSnap.exists ? existingSnap.data() : {};

  const userDoc = {
    role: existingUser.role || "client-staff",
    email: user.email || null,
    name: existingUser.name || user.displayName || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await userRef.set(userDoc, { merge: true });
  console.log("Created user doc:", user.uid);
});

exports.createBookkeeperAccount = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    department,
    position,
  } = data || {};

  if (!email || !password || !firstName || !lastName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email, password, first name, and last name are required."
    );
  }

  if (password.length < 6) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Password must be at least 6 characters."
    );
  }

  let createdUser = null;

  try {
    createdUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
      disabled: false,
    });

    await admin.auth().setCustomUserClaims(createdUser.uid, {
      role: "bookkeeper",
    });

    await db.collection("users").doc(createdUser.uid).set(
      {
        email,
        role: "bookkeeper",
        accountType: "bookkeeper",
        createdBy: context.auth.uid,
        firstName,
        lastName,
        phoneNumber: phoneNumber || "",
        department: department || "Accounting",
        position: position || "Bookkeeper",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      uid: createdUser.uid,
      message: "Bookkeeper account created.",
    };
  } catch (error) {
    if (createdUser?.uid) {
      await admin.auth().deleteUser(createdUser.uid).catch(() => {});
    }

    if (error.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError(
        "already-exists",
        "This email is already registered."
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      error.message || "Unable to create bookkeeper account."
    );
  }
});

exports.updateUserTimestamp = functions.firestore
  .document("users/{uid}")
  .onUpdate((change) => {
    return change.after.ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

exports.setUserRole = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header." });
    }

    const idToken = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerRole = await getUserRole(decoded.uid);

    if (callerRole !== "admin") {
      return res.status(403).json({
        error: "Forbidden. Only admins can assign roles.",
      });
    }

    const { uid, role } = req.body;
    if (!uid || !role) {
      return res.status(400).json({
        error: "Missing required fields: uid, role",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid role "${role}". Valid roles: ${VALID_ROLES.join(", ")}`,
      });
    }

    await db.collection("users").doc(uid).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      message: `Role "${role}" assigned to user ${uid} successfully.`,
    });
  } catch (err) {
    console.error("Error in setUserRole:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

exports.assignBookkeeperToClient = functions.https.onCall(async (data, context) => {
  try {
    await assertAdmin(context);

    const { clientId, bookkeeperId, bookkeeperName } = data || {};
    if (!clientId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required field: clientId."
      );
    }

    const isUnassigning = !bookkeeperId || bookkeeperId === "NONE";
    const clientRef = db.collection("clientCompanies").doc(clientId);
    const clientSnap = await clientRef.get();

    if (!clientSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Client company was not found."
      );
    }

    let resolvedBookkeeperName = null;
    if (!isUnassigning) {
      const bookkeeperSnap = await db.collection("users").doc(bookkeeperId).get();
      const bookkeeper = bookkeeperSnap.data();

      if (!bookkeeperSnap.exists || bookkeeper?.role?.toLowerCase() !== "bookkeeper") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Selected user is not a bookkeeper."
        );
      }

      resolvedBookkeeperName =
        bookkeeperName ||
        [bookkeeper.firstName, bookkeeper.lastName].filter(Boolean).join(" ") ||
        bookkeeper.email ||
        "Bookkeeper";
    }

    await clientRef.update({
      bookkeeperId: isUnassigning ? null : bookkeeperId,
      bookkeeperName: isUnassigning ? null : resolvedBookkeeperName,
      status: isUnassigning ? "Awaiting Assignment" : "Assigned",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedAt: isUnassigning ? null : admin.firestore.FieldValue.serverTimestamp(),
    });

    if (!isUnassigning) {
      try {
        await db.collection("notifications").add({
          userId: bookkeeperId,
          message: `You have been assigned: ${clientSnap.data().name || "Client company"}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      } catch (error) {
        console.warn("Bookkeeper assigned, but notification was not created:", error);
      }
    }

    return {
      success: true,
      message: isUnassigning
        ? "Bookkeeper removed from client."
        : `${resolvedBookkeeperName} assigned to ${clientSnap.data().name || "client"}.`,
    };
  } catch (error) {
    console.error("assignBookkeeperToClient failed:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      error.message || "Assignment backend failed."
    );
  }
});

exports.ping = functions.https.onRequest((req, res) => {
  res.status(200).json({ message: "API alive." });
});

exports.deleteCloudinaryMedia = functions.https.onCall(async (data) => {
  const { publicId, resourceType } = data;

  try {
    const cloudinary = require("cloudinary").v2;
    const cloudinaryRes = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return { success: true, cloudinaryRes };
  } catch (err) {
    console.error(err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// useAuthRole.js

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../database-components/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../database-components/firebaseConfig";
import { roleConfig } from "./roleConfig";

const VALID_ROLES = new Set(["admin", "bookkeeper", "client-staff"]);

const normalizeRole = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  return VALID_ROLES.has(normalized) ? normalized : "client-staff";
};

export default function useAuthRole() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);

      if (!authUser) {
        setUser(null);
        setRole(null);
        sessionStorage.removeItem("jjmcUser");
        localStorage.removeItem("role");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", authUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        const extractedRole = normalizeRole(userData.role);

        const normalizedUser = {
          uid: authUser.uid,
          email: authUser.email,
          ...userData,
          role: extractedRole,
        };

        setUser(normalizedUser);
        setRole(extractedRole);
        sessionStorage.setItem("jjmcUser", JSON.stringify(normalizedUser));
        localStorage.setItem("role", extractedRole);
      } catch (err) {
        console.error("Error loading Firestore user role:", err);

        const fallbackUser = {
          uid: authUser.uid,
          email: authUser.email,
          role: "client-staff",
        };

        setUser(fallbackUser);
        setRole("client-staff");
        sessionStorage.setItem("jjmcUser", JSON.stringify(fallbackUser));
        localStorage.setItem("role", "client-staff");
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    loading,
    user,
    role,
    roleConfig,
  };
}

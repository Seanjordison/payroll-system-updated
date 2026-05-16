import React from "react";
import { IonSpinner } from "@ionic/react";
import { Redirect } from "react-router-dom";
import useAuthRole from "../hooks/useAuthRole";

const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

export default function RoleGuard({ allowedRole, children }) {
  const { loading, user, role } = useAuthRole();
  const allowedRoles = Array.isArray(allowedRole)
    ? allowedRole.map(normalizeRole)
    : [normalizeRole(allowedRole)];
  const currentRole = normalizeRole(role || user?.role);

  if (loading) {
    return <IonSpinner name="crescent" />;
  }

  if (!user) {
    return <Redirect to="/welcome" />;
  }

  if (!allowedRoles.includes(currentRole)) {
    const redirectMap = {
      "client-staff": "/client-staff-home",
      bookkeeper: "/bookkeeper-home",
      admin: "/admin-home",
    };

    return <Redirect to={redirectMap[currentRole] || "/welcome"} />;
  }

  return <>{children}</>;
}

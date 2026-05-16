import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
} from "@ionic/react";

import FooterNav from "../../components/FooterNav";
import useAuthRole from "../../hooks/useAuthRole";
import { fetchAdminDashboardSnapshot } from "../../services/adminBackendService";
import "./AdminPages.css";

const dashboardCards = [
  {
    title: "Manage Accounts",
    text: "Create bookkeeper accounts and review client staff records.",
    path: "/admin-manage-accounts",
  },
  {
    title: "System Monitor",
    text: "Track account totals, client companies, inquiries, and payroll work.",
    path: "/admin-system-monitor",
  },
];

export default function HomeAdmin() {
  const { user } = useAuthRole();
  const [counts, setCounts] = useState({
    users: 0,
    bookkeepers: 0,
    clients: 0,
  });
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const snapshot = await fetchAdminDashboardSnapshot();
        if (!active) return;

        setCounts({
          users: snapshot.users.length,
          bookkeepers: snapshot.users.filter((item) => item.role === "bookkeeper").length,
          clients: snapshot.clients.length,
        });
        setBackendError(
          snapshot.errors.length > 0
            ? `Could not load: ${snapshot.errors.map((error) => error.section).join(", ")}.`
            : ""
        );
      } catch (error) {
        if (active) setBackendError(error.message);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const username = user?.firstName || user?.email || "Admin";

  return (
    <IonPage id="main-content">
      <IonContent fullscreen className="admin-content admin-dashboard-content">
        <IonImg src="/assets/Gradient-Ellipses.png" className="admin-bg" />

        <IonGrid className="admin-shell admin-dashboard-shell">
          <IonRow>
            <IonCol>
              <IonText>
                <h1 className="admin-title">Admin Dashboard</h1>
                <p className="admin-subtitle">Welcome back, {username}.</p>
                {backendError && <p className="admin-warning">{backendError}</p>}
              </IonText>
            </IonCol>
          </IonRow>

          <IonRow className="admin-stat-row">
            <IonCol size="12" sizeMd="4">
              <IonCard className="admin-card admin-stat-card">
                <IonCardContent>
                  <p className="admin-stat">{counts.users}</p>
                  <p className="admin-card-text">Total accounts</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="4">
              <IonCard className="admin-card admin-stat-card">
                <IonCardContent>
                  <p className="admin-stat">{counts.bookkeepers}</p>
                  <p className="admin-card-text">Bookkeepers</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="4">
              <IonCard className="admin-card admin-stat-card">
                <IonCardContent>
                  <p className="admin-stat">{counts.clients}</p>
                  <p className="admin-card-text">Client companies</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow className="admin-dashboard-card-row">
            {dashboardCards.map((card) => (
              <IonCol key={card.path} size="12" sizeMd="6">
                <IonCard routerLink={card.path} className="admin-card admin-dashboard-card">
                  <IonCardHeader>
                    <IonCardTitle className="admin-card-title">{card.title}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p className="admin-card-text">{card.text}</p>
                    <div className="admin-actions">
                      <IonButton className="admin-primary-btn" routerLink={card.path}>
                        Open
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </IonContent>

      <FooterNav />
    </IonPage>
  );
}

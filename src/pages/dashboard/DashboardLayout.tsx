import { Outlet } from "react-router-dom";
import { useEffect } from "react";

import { DashboardSidebar } from "../../components/dashboard/DashboardSidebar";
import styles from "../../styles/dashboard.module.css";

export function DashboardLayout() {
  useEffect(() => {
    document.body.classList.add("wbcDashboard");
    return () => document.body.classList.remove("wbcDashboard");
  }, []);

  return (
    <div className={styles.shell}>
      <DashboardSidebar />
      <div className={styles.main}>
        <Outlet />
      </div>
    </div>
  );
}


import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { Navbar } from "./components/Navbar";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { DashboardLayout } from "./pages/dashboard/DashboardLayout";
import { DashboardHome } from "./pages/dashboard/DashboardHome";
import { DashboardMenu } from "./pages/dashboard/DashboardMenu";
import { DashboardTelegram } from "./pages/dashboard/DashboardTelegram";
import { DashboardTracker } from "./pages/dashboard/DashboardTracker";
import { hasSession } from "./lib/session";

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!hasSession()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function App() {
  const location = useLocation();
  const onDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const isDashboardHost = typeof window !== "undefined" && window.location.hostname.startsWith("dashboard.");
  return (
    <>
      {onDashboard ? null : <Navbar />}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={isDashboardHost ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="telegram" element={<DashboardTelegram />} />
          <Route path="tracker" element={<DashboardTracker />} />
          <Route path="menu" element={<DashboardMenu />} />
        </Route>
        <Route path="*" element={<Navigate to={isDashboardHost ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}

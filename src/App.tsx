import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

import { Navbar } from "./components/Navbar";
import { Landing } from "./pages/Landing";
import { Register } from "./pages/Register";
import { Track } from "./pages/Track";

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

export function App() {
  return (
    <>
      <Navbar />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/track" element={<Track />} />
        <Route path="/dashboard" element={<Navigate to="/track" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

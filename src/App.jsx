// 🌐 React Core
import React, { useState, useEffect } from "react";

// 💫 Animation
import { AnimatePresence } from "framer-motion";

import 'leaflet/dist/leaflet.css';

import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import Layout from "./components/Layout";
import MyComplaintsPage from "./pages/MyComplaintsPage";
import ProfilePage from "./pages/ProfilePage";
import SubmitGrievancePage from "./pages/SubmitGrievancePage";
import { GlobalSpinner } from "./components/ui";


// --- Main App Component ---
function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}

function Main() {
  const { user, loading, skipped } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    // On initial load, if the user is not logged in, show the auth page.
    if (!loading && !user && !skipped) {
      setCurrentPage("auth");
    } else if (!loading && (user || skipped)) {
      // If user is loaded and logged in, default to dashboard
      // This logic can be expanded based on user roles or other criteria
      setCurrentPage("dashboard");
    }
  }, [user, loading, skipped]);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };
  
  const handleGrievanceSubmitted = () => {
    setCurrentPage("dashboard");
  };

  if (loading) {
    return <GlobalSpinner message="Initializing..." />;
  }
  
  if (!user && !skipped) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "submit":
        return <SubmitGrievancePage onGrievanceSubmitted={handleGrievanceSubmitted} />;
      case "mycomplaints":
        return <MyComplaintsPage onNavigate={handleNavigate} />;
      case "profile":
        return <ProfilePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout onNavigate={handleNavigate}>
      <AnimatePresence mode="wait">
        {renderPage()}
      </AnimatePresence>
    </Layout>
  );
}

export default App;

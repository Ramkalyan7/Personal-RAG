import { Navigate, Route, Routes } from "react-router-dom";

import { AppHeader } from "./components/AppHeader";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SignupPage } from "./pages/SignupPage";
import { useAuth } from "./providers/AuthProvider";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-shell">
      <AppHeader />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate replace to="/projects" /> : <LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </div>
  );
}

export default App;

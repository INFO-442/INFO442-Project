import { createBrowserRouter, Outlet, Navigate } from "react-router";

import DashboardPage from './pages/Dashboard/Dashboard.jsx'
import FeedbackPage from "./pages/Feedback/Feedback.jsx";
import QuestionsPage from "./pages/Questions/Questions.jsx";
import SettingsPage from "./pages/Settings/Settings.jsx";
import LoginPage from "./pages/Login/Login.jsx";
import SignupPage from "./pages/Signup/Signup.jsx";
import CustomerPage from "./pages/Customer/Customer.jsx";

function DashboardLayout() {
  return (
    <Outlet />
  )
}

const AppRoutes = createBrowserRouter([
    {
    element: <DashboardLayout />,
    children: [
        { path: "/", element: <DashboardPage /> },
        { path: "/feedback", element: <FeedbackPage /> },
        { path: "/questions", element: <QuestionsPage /> },
        { path: "/settings", element: <SettingsPage /> },
        { path: "/login", element: <LoginPage /> },
        { path: "/signup", element: <SignupPage /> },
        { path: "*", element: <Navigate to="/" /> },
    ],
    },
    { path: "/customer", element: <CustomerPage /> },
]);

export default AppRoutes;

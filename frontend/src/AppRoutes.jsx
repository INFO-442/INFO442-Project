import { useEffect, useState } from "react";
import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router";
import { supabase } from "@/lib/supabase";

import Navbar from "@/components/Navbar/Navbar.jsx";
import Footer from "@/components/Footer/Footer.jsx";
import DashboardPage from "@/pages/Dashboard/Dashboard.jsx";
import FeedbackPage from "@/pages/Feedback/Feedback.jsx";
import QuestionsPage from "@/pages/Questions/Questions.jsx";
import SettingsPage from "@/pages/Settings/Settings.jsx";
import LoginPage from "@/pages/Login/Login.jsx";
import SignupPage from "@/pages/Signup/Signup.jsx";
import CustomerPage from "@/pages/Customer/Customer.jsx";

function OwnerLayout() {
  return (
    <>
      <Navbar type="owner" />
      <Outlet />
      <Footer />
    </>
  );
}

function GuestLayout() {
  return (
    <>
      <Navbar type="guest" />
      <Outlet />
      <Footer />
    </>
  );
}

function CustomerLayout() {
  const { business } = useParams();
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("name")
      .eq("slug", business)
      .maybeSingle()
      .then(({ data }) => setRestaurantName(data?.name ?? ""));
  }, [business]);

  return (
    <>
      <Navbar type="customer" restaurantName={restaurantName} />
      <Outlet />
      <Footer />
    </>
  );
}

const AppRoutes = createBrowserRouter([
  {
    element: <OwnerLayout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/feedback", element: <FeedbackPage /> },
      { path: "/questions", element: <QuestionsPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  {
    element: <GuestLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
    ],
  },
  {
    path: "/c/:business",
    element: <CustomerLayout />,
    children: [{ index: true, element: <CustomerPage /> }],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default AppRoutes;
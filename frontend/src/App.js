import "@/App.css";
import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SoundProvider } from "@/context/SoundContext";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Lobby from "@/pages/Lobby";
import SlotGame from "@/pages/SlotGame";
import FlagshipSlot from "@/pages/FlagshipSlot";
import KenoGame from "@/pages/KenoGame";
import CoinFlipGame from "@/pages/CoinFlipGame";
import Wallet from "@/pages/Wallet";
import Cashier from "@/pages/Cashier";
import Profile from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";
import Vip from "@/pages/Vip";
import ResponsibleGaming from "@/pages/ResponsibleGaming";
import FleetSales from "@/pages/FleetSales";
import LegalPage from "@/pages/LegalPage";
import AdminDashboard from "@/pages/AdminDashboard";
import PaymentSuccess from "@/pages/PaymentSuccess";
import AuthCallback from "@/pages/AuthCallback";
import KycPage from "@/pages/Kyc";
import { useParams } from "react-router-dom";
import { FLAGSHIP_IDS } from "@/data/gameMeta";

function SlotRoute() {
  const { id } = useParams();
  return FLAGSHIP_IDS.includes(id) ? <FlagshipSlot /> : <SlotGame />;
}

function Protected({ children }) {
  const { user, openAuth } = useAuth();
  useEffect(() => {
    if (user === false) openAuth("login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  if (user === null) {
    return (
      <div className="max-w-2xl mx-auto p-16 font-mono text-nvg/70">
        // establishing secure link...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/slots/:id" element={<SlotRoute />} />
        <Route path="/keno" element={<KenoGame />} />
        <Route path="/coinflip" element={<CoinFlipGame />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/vip" element={<Vip />} />
        <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
        <Route path="/fleet-sales" element={<FleetSales />} />
        <Route path="/terms" element={<LegalPage slug="terms" />} />
        <Route path="/privacy" element={<LegalPage slug="privacy" />} />
        <Route
          path="/responsible-gambling"
          element={<LegalPage slug="responsible-gambling" />}
        />
        <Route
          path="/age-verification"
          element={<LegalPage slug="age-verification" />}
        />
        <Route
          path="/cookie-policy"
          element={<LegalPage slug="cookie-policy" />}
        />
        <Route path="/aml-policy" element={<LegalPage slug="aml-policy" />} />
        <Route path="/bonus-terms" element={<LegalPage slug="bonus-terms" />} />
        <Route
          path="/wallet"
          element={
            <Protected>
              <Wallet />
            </Protected>
          }
        />
        <Route
          path="/cashier"
          element={
            <Protected>
              <Cashier />
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
        <Route
          path="/kyc"
          element={
            <Protected>
              <KycPage />
            </Protected>
          }
        />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

const TOAST_OPTIONS = {
  style: {
    background: "#0a0d0a",
    border: "1px solid rgba(78,228,78,0.3)",
    color: "#eafff0",
    fontFamily: "IBM Plex Mono, monospace",
    borderRadius: "2px",
  },
};

function App() {
  return (
    <AuthProvider>
      <SoundProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
        </BrowserRouter>
      </SoundProvider>
    </AuthProvider>
  );
}

export default App;

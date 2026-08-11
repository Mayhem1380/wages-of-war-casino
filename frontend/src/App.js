import "@/App.css";
import React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SoundProvider } from "@/context/SoundContext";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Lobby from "@/pages/Lobby";
import SlotGame from "@/pages/SlotGame";
import KenoGame from "@/pages/KenoGame";
import CoinFlipGame from "@/pages/CoinFlipGame";
import Wallet from "@/pages/Wallet";
import Profile from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";
import Vip from "@/pages/Vip";
import ResponsibleGaming from "@/pages/ResponsibleGaming";
import PaymentSuccess from "@/pages/PaymentSuccess";
import AuthCallback from "@/pages/AuthCallback";

function Protected({ children }) {
  const { user, openAuth } = useAuth();
  if (user === null) {
    return <div className="max-w-2xl mx-auto p-16 font-mono text-nvg/70">// establishing secure link...</div>;
  }
  if (!user) {
    openAuth("login");
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
        <Route path="/slots/:id" element={<SlotGame />} />
        <Route path="/keno" element={<KenoGame />} />
        <Route path="/coinflip" element={<CoinFlipGame />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/vip" element={<Vip />} />
        <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
        <Route path="/wallet" element={<Protected><Wallet /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <SoundProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#0a0d0a",
                border: "1px solid rgba(78,228,78,0.3)",
                color: "#eafff0",
                fontFamily: "IBM Plex Mono, monospace",
                borderRadius: "2px",
              },
            }}
          />
        </BrowserRouter>
      </SoundProvider>
    </AuthProvider>
  );
}

export default App;

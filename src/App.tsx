import React from "react";
import { Routes, Route, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import MobileFrame from "./components/MobileFrame";
import ChatSection from "./components/ChatSection";
import CheckoutSection from "./components/CheckoutSection";
import SuccessSection from "./components/SuccessSection";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import MySongs from "./pages/MySongs";
import FAQ from "./pages/FAQ";
// Terms, Privacy will be added shortly

function ChatRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Protect route
  if (!user) {
    navigate("/login");
    return null;
  }

  const handleFinishChat = async (chatTranscript: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          chatTranscript,
          structuredPrompt: JSON.stringify(chatTranscript),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        navigate(`/checkout/${data.orderId}`, {
          state: {
            paymentQr: data.paymentQr,
            paymentCopiaCola: data.paymentCopiaCola,
            paymentId: data.paymentId
          }
        });
      } else {
        throw new Error("Checkout failed");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao ir para o pagamento.");
    }
  };

  return (
    <MobileFrame>
      <ChatSection email={user.email} onFinishChat={handleFinishChat} />
    </MobileFrame>
  );
}

function CheckoutRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  // If no state, we should fetch it or just error out for MVP
  const paymentQr = state?.paymentQr || "";
  const paymentCopiaCola = state?.paymentCopiaCola || "";

  if (!id) return null;

  return (
    <MobileFrame>
      <CheckoutSection
        orderId={id}
        paymentQr={paymentQr}
        paymentCopiaCola={paymentCopiaCola}
        onPaymentConfirmed={() => navigate(`/musica/${id}`)}
      />
    </MobileFrame>
  );
}

function MySongsRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Protect route
  if (!user) {
    navigate("/login");
    return null;
  }

  return <MySongs />;
}

function SuccessRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  if (!id) return null;

  return (
    <MobileFrame>
      <SuccessSection orderId={id} onRestart={() => navigate("/")} />
    </MobileFrame>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/minhas-musicas" element={<MySongsRoute />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/chat" element={<ChatRoute />} />
        <Route path="/checkout/:id" element={<CheckoutRoute />} />
        <Route path="/musica/:id" element={<SuccessRoute />} />
      </Routes>
    </AuthProvider>
  );
}

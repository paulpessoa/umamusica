import React from "react"
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Navigate
} from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { ChatMessage } from "./types"
import MobileFrame from "./components/MobileFrame"
import ChatSection from "./components/ChatSection"
import CheckoutSection from "./components/CheckoutSection"
import SuccessSection from "./components/SuccessSection"
import BackendWakeup from "./components/BackendWakeup"

// Pages
import Home from "./pages/Home"
import Login from "./pages/Login"
import Menu from "./pages/Menu"
import MySongs from "./pages/MySongs"
import FAQ from "./pages/FAQ"
import NotFound from "./pages/NotFound"
import Invite from "./pages/Invite"
import CookieBanner from "./components/CookieBanner"
import Terms from "./pages/Terms"
import Privacy from "./pages/Privacy"
import ChatHistory from "./pages/ChatHistory"
import PurchaseHistory from "./pages/PurchaseHistory"
import AdminCosts from "./pages/AdminCosts"
import Friends from "./pages/Friends"
import MiniPlayer from "./components/MiniPlayer"
import RouteLoader from "./components/RouteLoader"
import { PlayerProvider } from "./contexts/PlayerContext"

function ChatRoute() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Protect route (RequireAuth handles redirect, this is just for TS)
  if (!user) {
    return null
  }

  const handleFinishChat = async (chatTranscript: any, sessionId: string | null) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.session_token}`
          },
          body: JSON.stringify({
            email: user.email,
            sessionId
          })
        }
      )
      if (response.ok) {
        const data = await response.json()
        navigate(`/checkout/${data.orderId}`, {
          state: {
            paymentQr: data.paymentQr,
            paymentCopiaCola: data.paymentCopiaCola,
            paymentId: data.paymentId
          }
        })
      } else {
        throw new Error("Checkout failed")
      }
    } catch (e) {
      console.error(e)
      alert("Erro ao ir para o pagamento.")
    }
  }

  const initialMessages = location.state?.initialMessages as
    | ChatMessage[]
    | undefined

  return (
    <MobileFrame>
      <ChatSection
        email={user.email}
        name={user.name}
        onFinishChat={handleFinishChat}
        initialMessages={initialMessages}
      />
    </MobileFrame>
  )
}

function CheckoutRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state || {}
  // If no state, we should fetch it or just error out for MVP
  const paymentQr = state?.paymentQr || ""
  const paymentCopiaCola = state?.paymentCopiaCola || ""

  if (!id) return null

  return (
    <MobileFrame>
      <CheckoutSection
        orderId={id}
        paymentQr={paymentQr}
        paymentCopiaCola={paymentCopiaCola}
        onPaymentConfirmed={() => navigate(`/musica/${id}`)}
      />
    </MobileFrame>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function SuccessRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  if (!id) return null

  return (
    <MobileFrame>
      <SuccessSection
        orderId={id}
        isSharedView={!user}
        onRestart={() => navigate("/")}
      />
    </MobileFrame>
  )
}

export default function App() {
  return (
    <BackendWakeup>
      <AuthProvider>
        <PlayerProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/minhas-musicas" element={<RequireAuth><MySongs /></RequireAuth>} />
            <Route path="/historico-chats" element={<RequireAuth><ChatHistory /></RequireAuth>} />
            <Route path="/chats" element={<RequireAuth><ChatHistory /></RequireAuth>} />
            <Route path="/historico-compras" element={<RequireAuth><PurchaseHistory /></RequireAuth>} />
            <Route path="/amigos" element={<RequireAuth><Friends /></RequireAuth>} />
            <Route path="/indicacoes" element={<RequireAuth><Friends /></RequireAuth>} />
            <Route path="/admin/custos" element={<AdminCosts />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/chat" element={<RequireAuth><ChatRoute /></RequireAuth>} />
            <Route path="/checkout/:id" element={<CheckoutRoute />} />
            <Route path="/musica/:id" element={<SuccessRoute />} />
            <Route path="/convite/:code" element={<Invite />} />
            <Route path="/termos" element={<Terms />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MiniPlayer />
          <CookieBanner />
          <RouteLoader />
        </PlayerProvider>
      </AuthProvider>
    </BackendWakeup>
  )
}

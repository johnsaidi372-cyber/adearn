import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WatchAds from './pages/WatchAds'
import History from './pages/History'
import Withdraw from './pages/Withdraw'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Payouts from './pages/Payouts'
import { useAuth } from './context/AuthContext'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <FullScreenLoader />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          user ? <Layout /> : <Navigate to="/login" replace />
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/watch" element={<WatchAds />} />
        <Route path="/history" element={<History />} />
        <Route path="/withdraw" element={<Withdraw />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

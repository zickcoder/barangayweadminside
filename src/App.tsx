import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/hooks/useTheme'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'

// Pages
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import IncomingCommunications from '@/pages/IncomingCommunications'
import BroadcastAlerts from '@/pages/BroadcastAlerts'
import CommunicationLogs from '@/pages/CommunicationLogs'
import EmergencyHotlines from '@/pages/EmergencyHotlines'
import Settings from '@/pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Protected Route Wrapper Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground">Loading Admin Portal...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Admin Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/incoming" element={<IncomingCommunications />} />
                <Route path="/broadcast" element={<BroadcastAlerts />} />
                <Route path="/logs" element={<CommunicationLogs />} />
                <Route path="/hotlines" element={<EmergencyHotlines />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App

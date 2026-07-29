import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/hooks/useTheme'
import { AppLayout } from '@/components/layout/AppLayout'

// Pages
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/incoming" element={<IncomingCommunications />} />
              <Route path="/broadcast" element={<BroadcastAlerts />} />
              <Route path="/logs" element={<CommunicationLogs />} />
              <Route path="/hotlines" element={<EmergencyHotlines />} />
              <Route path="/settings" element={<Settings />} />
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App

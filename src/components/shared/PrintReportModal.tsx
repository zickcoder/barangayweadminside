import { Printer, X, FileText, CheckCircle2, AlertTriangle, Flame, ShieldAlert, BarChart3, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

interface PriorityItem {
  name: string
  key: string
  count: number
  color: string
}

interface TypeItem {
  name: string
  count: number
  color: string
}

interface PrintReportModalProps {
  open: boolean
  onClose: () => void
  priorityData: PriorityItem[]
  typeData: TypeItem[]
  monthAlertsCount: number
  todayAlertsCount: number
  totalAlertsCount: number
  allIncidentsCount: number
  resolvedCount: number
  incidentTypeFilter: string
  timeFilter: string
  adminEmail?: string
}

export function PrintReportModal({
  open,
  onClose,
  priorityData,
  typeData,
  monthAlertsCount,
  todayAlertsCount,
  totalAlertsCount,
  allIncidentsCount,
  resolvedCount,
  incidentTypeFilter,
  timeFilter,
  adminEmail = 'admin@barangay178.gov.ph',
}: PrintReportModalProps) {
  if (!open) return null

  const handlePrint = () => {
    window.print()
  }

  const generatedTimestamp = formatDate(new Date().toISOString())
  const totalCategoryAlerts = typeData.reduce((acc, curr) => acc + curr.count, 0)
  const totalMonthPriority = priorityData.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:p-0">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative z-50 w-full max-w-4xl max-h-[92vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up print:m-0 print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
        
        {/* Modal Action Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-muted/40 border-b border-border no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">
                Analytics &amp; Historical Reports — Print Preview
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Official report document formatted for A4 / Letter PDF saving
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handlePrint}
              className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save to PDF</span>
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-muted/20 print:bg-white print:p-0 print:overflow-visible">
          <div
            id="printable-analytics-report"
            className="max-w-[800px] mx-auto bg-card text-foreground border border-border print:border-none rounded-xl p-6 sm:p-10 shadow-sm print:shadow-none print:p-0 space-y-6"
          >
            {/* ── Official LGU Header ── */}
            <div className="border-b-2 border-primary/40 pb-5 text-center relative">
              <div className="flex items-center justify-center gap-4 mb-2">
                <img
                  src="/logo.png"
                  alt="Barangay 178 Logo"
                  className="w-16 h-16 object-contain drop-shadow-xs"
                />
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
                    Republic of the Philippines &bull; City of Caloocan
                  </p>
                  <h1 className="text-xl sm:text-2xl font-black font-display text-foreground tracking-tight">
                    BARANGAY 178
                  </h1>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    Emergency Operations &amp; Disaster Risk Reduction Center
                  </p>
                </div>
              </div>
              <div className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-extrabold text-primary tracking-wide uppercase">
                Official Analytics &amp; Historical Summary Report
              </div>
            </div>

            {/* ── Document Metadata ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Report Date</p>
                <p className="font-bold text-foreground mt-0.5">{generatedTimestamp}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Reporting System</p>
                <p className="font-bold text-foreground mt-0.5">Barangay 178 ECS</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Time Filter</p>
                <p className="font-bold text-primary capitalize mt-0.5">{timeFilter === 'week' ? 'Last 7 Days' : timeFilter === 'month' ? 'This Month' : 'This Year'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Prepared By</p>
                <p className="font-bold text-foreground truncate mt-0.5">{adminEmail}</p>
              </div>
            </div>

            {/* ── Executive Summary KPIs ── */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                Executive Incident &amp; Communication Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border bg-card">
                  <p className="text-[11px] text-muted-foreground font-medium">Broadcasts Sent (Month)</p>
                  <p className="text-2xl font-black text-foreground mt-1">{monthAlertsCount}</p>
                  <p className="text-[10px] text-primary font-semibold mt-0.5">Current Calendar Month</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-card">
                  <p className="text-[11px] text-muted-foreground font-medium">Broadcasts Sent (Today)</p>
                  <p className="text-2xl font-black text-foreground mt-1">{todayAlertsCount}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Active daily count</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-card">
                  <p className="text-[11px] text-muted-foreground font-medium">Total Lifetime Alerts</p>
                  <p className="text-2xl font-black text-foreground mt-1">{totalAlertsCount}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Cumulative broadcasts</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-card">
                  <p className="text-[11px] text-muted-foreground font-medium">Incoming Citizen Incidents</p>
                  <p className="text-2xl font-black text-foreground mt-1">{allIncidentsCount}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                    {resolvedCount} actioned / dispatched
                  </p>
                </div>
              </div>
            </div>

            {/* ── SECTION 1: Broadcasts by Priority Level (This Month) ── */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <h2 className="text-sm font-bold font-display text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  1. Broadcasts by Priority Level (This Month)
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Current Month Breakdown
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Statistical distribution of all official broadcasts dispatched to Barangay 178 residents during the active month.
              </p>

              <div className="overflow-hidden border border-border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-bold uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4">Priority Classification</th>
                      <th className="py-2.5 px-4 text-center">Alert Level</th>
                      <th className="py-2.5 px-4 text-right">Total Broadcasts</th>
                      <th className="py-2.5 px-4 text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {priorityData.map((item) => {
                      const pct = totalMonthPriority > 0
                        ? ((item.count / totalMonthPriority) * 100).toFixed(1)
                        : '0.0'
                      const isEmergency = item.key === 'EMERGENCY'
                      return (
                        <tr key={item.name} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full inline-block"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isEmergency
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}>
                              {isEmergency ? 'Critical Siren & Push' : 'General Advisory'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-foreground text-sm">
                            {item.count}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-muted-foreground">
                            {pct}%
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-muted/30 font-bold">
                      <td className="py-2.5 px-4 text-foreground" colSpan={2}>
                        Total Broadcasts Dispatched (This Month)
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-foreground text-sm">
                        {totalMonthPriority}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-foreground">
                        100.0%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SECTION 2: Alerts by Incident Type ── */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <h2 className="text-sm font-bold font-display text-foreground flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  2. Alerts by Incident Type
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  Timeframe: {incidentTypeFilter.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Categorized emergency hazard classification and community alerts logged in the system.
              </p>

              <div className="overflow-hidden border border-border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-bold uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4">Emergency Incident Category</th>
                      <th className="py-2.5 px-4 text-center">BDRRMC Response Team</th>
                      <th className="py-2.5 px-4 text-right">Logged Alerts</th>
                      <th className="py-2.5 px-4 text-right">Category Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {typeData.map((t) => {
                      const pct = totalCategoryAlerts > 0
                        ? ((t.count / totalCategoryAlerts) * 100).toFixed(1)
                        : '0.0'
                      const responseTeams: Record<string, string> = {
                        FIRE: 'BFP / Barangay Tanod Fire Brigade',
                        FLOOD: 'MDRRMO Rescue / Evacuation Team',
                        CRIME: 'PNP Sub-Station 9 / Barangay Tanod',
                        MEDICAL: 'Barangay Health Center / EMS Ambulance',
                        EARTHQUAKE: 'BDRRMC Search & Rescue Unit',
                        OTHER: 'Barangay Disaster Operations Team',
                      }
                      return (
                        <tr key={t.name} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-foreground flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.name}
                          </td>
                          <td className="py-2.5 px-4 text-center text-[11px] text-muted-foreground">
                            {responseTeams[t.name] || 'Barangay Emergency Team'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground text-sm">
                            {t.count}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-muted-foreground">
                            {pct}%
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-muted/30 font-bold">
                      <td className="py-2.5 px-4 text-foreground" colSpan={2}>
                        Total Categorized Emergency Alerts
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-foreground text-sm">
                        {totalCategoryAlerts}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-foreground">
                        100.0%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Official Sign-off & Audit Certification ── */}
            <div className="pt-6 border-t border-border grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-12">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase">
                  Prepared &amp; Generated By:
                </p>
                <div className="border-t border-foreground/40 pt-1.5">
                  <p className="font-bold text-foreground">{adminEmail}</p>
                  <p className="text-[11px] text-muted-foreground">Barangay 178 System Administrator</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase">
                  Noted &amp; Certified By:
                </p>
                <div className="border-t border-foreground/40 pt-1.5">
                  <p className="font-bold text-foreground">HON. PUNONG BARANGAY / BDRRMC CHAIRMAN</p>
                  <p className="text-[11px] text-muted-foreground">Barangay 178, Caloocan City</p>
                </div>
              </div>
            </div>

            {/* ── Report Footer Notice ── */}
            <div className="pt-2 text-center border-t border-border/40">
              <p className="text-[10px] text-muted-foreground">
                Barangay 178 Emergency Communication System &bull; Confidential &bull; For Official Barangay &amp; Disaster Risk Reduction Record Use Only
              </p>
            </div>

          </div>
        </div>

        {/* Modal Bottom Footer (Hidden during print) */}
        <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t border-border no-print">
          <p className="text-xs text-muted-foreground">
            Tip: In the print dialog, choose <strong className="text-foreground">"Save as PDF"</strong> to download a digital PDF file.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save to PDF</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

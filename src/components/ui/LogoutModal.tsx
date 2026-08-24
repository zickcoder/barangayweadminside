import { LogOut, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LogoutModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LogoutModal({ open, onClose, onConfirm }: LogoutModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Popout Dialog Card */}
      <div className="relative z-50 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-up text-center">
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive shadow-inner">
          <LogOut className="w-7 h-7" />
        </div>

        {/* Text Content */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-foreground font-display">
            Confirm Logout
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed px-2">
            Are you sure you want to end your session and log out of the <strong>Barangay 178 Admin Portal</strong>?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="h-10 text-xs font-bold rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20 cursor-pointer"
          >
            Yes, Logout
          </Button>
        </div>
      </div>
    </div>
  )
}

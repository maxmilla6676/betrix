import { useState } from "react";
import { QrCode, Ticket, Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBetrix, makeCode } from "@/store/betrix";
import { fetchSlipByCode } from "@/services/backendSync";

interface LoadCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoadCodeModal({ open, onOpenChange }: LoadCodeModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { loadSlip, slip } = useBetrix();

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) { setError("Please enter a booking code."); return; }
    const found = await fetchSlipByCode(clean);
    if (!found || found.selections.length === 0) {
      setError(`No booking found for ${clean}.`);
      return;
    }
    loadSlip(found.selections);
    setCode("");
    setError("");
    onOpenChange(false);
  };

  const currentCode = slip.length > 0 ? makeCode() : "BTX-89F12";

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-[#111827] border-gray-200 max-w-sm rounded-2xl p-5 shadow-xl">
        <DialogHeader className="text-left border-b border-gray-100 pb-3">
          <DialogTitle className="flex items-center gap-2 text-gray-900 font-extrabold text-lg">
            <QrCode className="h-5 w-5 text-[#E41B23]" /> Load Booking Code
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleLoad} className="space-y-4 pt-2">
          <p className="text-xs text-gray-500">
            Got a booking code from a friend or tipster? Enter it below to load all selections directly into your bet slip.
          </p>

          <div className="space-y-1.5">
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder="e.g. BTX-78A9B"
              className="bg-gray-50 border-gray-200 text-gray-900 font-mono uppercase text-sm tracking-wider focus:border-[#E41B23] rounded-xl"
            />
            {error && <p className="text-xs text-[#E41B23] font-semibold">{error}</p>}
          </div>

          <Button type="submit" className="w-full bg-[#E41B23] text-white font-black text-sm hover:brightness-110 shadow-sm rounded-xl">
            Load Selections into Slip
          </Button>

          {slip.length > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-2">
              <p className="text-xs font-bold text-gray-400 mb-2">Share your current slip:</p>
              <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <Ticket className="h-4 w-4 text-[#00A859]" />
                <span className="font-mono text-sm font-black text-gray-900 flex-1">{currentCode}</span>
                <Button type="button" size="sm" variant="ghost" onClick={handleCopy} className="text-xs text-[#00A859] hover:text-[#00A859]">
                  {copied ? <Check className="h-4 w-4 text-[#00A859]" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

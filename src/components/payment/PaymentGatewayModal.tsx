import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  Zap,
  Coins,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBetrix, formatGHS } from "@/store/betrix";
import { createSeevCheckout, verifySeevPayment } from "@/services/seevplus";
import { cn } from "@/lib/utils";

export interface PaymentGatewayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
}

type PaymentMethod = "seevplus" | "mtn" | "telecel" | "at" | "card";

const PRESET_AMOUNTS = [30, 50, 100, 200, 300, 500, 1000];

export function PaymentGatewayModal({
  open,
  onOpenChange,
  defaultAmount = 300,
}: PaymentGatewayModalProps) {
  const { profile, deposit } = useBetrix();
  const [method, setMethod] = useState<PaymentMethod>("seevplus");
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [phone, setPhone] = useState<string>(profile.phone || "0205795789");

  // Card details state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Gateway Step state: "input" | "processing" | "checkout_redirect" | "prompt" | "success"
  const [step, setStep] = useState<"input" | "processing" | "checkout_redirect" | "prompt" | "success">("input");
  const [txRef, setTxRef] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const resetFlow = () => {
    setStep("input");
    setPin("");
    setCheckoutUrl(null);
    setPaymentId(null);
    setIsPolling(false);
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      resetFlow();
    }
    onOpenChange(newOpen);
  };

  const getMethodName = (m: PaymentMethod) => {
    switch (m) {
      case "seevplus":
        return "SeevPlus Multi-Pay";
      case "mtn":
        return "MTN Mobile Money";
      case "telecel":
        return "Telecel Cash (Vodafone)";
      case "at":
        return "AT Money (AirtelTigo)";
      case "card":
        return "Visa / Mastercard";
    }
  };

  // Poll for status when on checkout_redirect step
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (step === "checkout_redirect" && (paymentId || txRef)) {
      setIsPolling(true);

      const checkStatus = async () => {
        const verifyRes = await verifySeevPayment(paymentId || undefined, txRef);
        if (verifyRes.verified) {
          deposit(amount, `SeevPlus · ${getMethodName(method)}`, txRef);
          setStep("success");
          toast.success(`Deposit of GHS ${amount.toFixed(2)} confirmed via SeevPlus!`);
          setIsPolling(false);
          return;
        }

        // Keep polling every 4 seconds
        timer = setTimeout(checkStatus, 4000);
      };

      timer = setTimeout(checkStatus, 4000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [step, paymentId, txRef, amount, method, deposit]);

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount in GHS Cedis");
      return;
    }
    if (amount < 1) {
      toast.error("Minimum deposit is GHS 1.00");
      return;
    }
    if (method !== "card" && (!phone || phone.length < 9)) {
      toast.error("Please enter a valid Ghana mobile number");
      return;
    }

    setStep("processing");

    // Call SeevPlus Checkout Serverless Endpoint
    const res = await createSeevCheckout({
      amount,
      currency: "GHS",
      phone,
      name: profile.userId || "Betrix Player",
      method: getMethodName(method),
      metadata: {
        method,
      },
    });

    setTxRef(res.reference);

    if (res.checkoutUrl) {
      // Live SeevPlus checkout URL returned
      setCheckoutUrl(res.checkoutUrl);
      setPaymentId(res.paymentId || null);
      setStep("checkout_redirect");
      // Optionally open the checkout window
      window.open(res.checkoutUrl, "_blank");
    } else {
      // Sandbox or in-app direct MoMo authorization prompt
      setStep("prompt");
    }
  };

  const handleAuthorizePayment = () => {
    setStep("processing");

    setTimeout(() => {
      deposit(amount, `SeevPlus · ${getMethodName(method)}`, txRef);
      setStep("success");
      toast.success(`Deposit of GHS ${amount.toFixed(2)} successful! Balance updated.`);
    }, 1500);
  };

  const handleManualVerify = async () => {
    setStep("processing");
    const verifyRes = await verifySeevPayment(paymentId || undefined, txRef);

    if (verifyRes.verified) {
      deposit(amount, `SeevPlus · ${getMethodName(method)}`, txRef);
      setStep("success");
      toast.success(`Deposit of GHS ${amount.toFixed(2)} verified and credited!`);
    } else {
      setStep("checkout_redirect");
      toast.info("Payment still pending. If you just authorized on your phone, click verify again in a moment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#14141a] text-white border-[#242430] max-w-md rounded-3xl p-0 overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="bg-[#1c1c24] border-b border-[#2a2a38] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#F5C400]/10 border border-[#F5C400]/30 grid place-items-center text-[#F5C400]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                BETRIX Pay
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">Powered by SeevPlus Gateway</p>
            </div>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> SeevPlus Live
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {step === "input" && (
            <form onSubmit={handleInitiatePayment} className="space-y-4">
              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Select Gateway Method</span>
                  <span className="text-[10px] font-bold text-[#F5C400] lowercase">0% deposit fee</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: "seevplus" as const,
                      name: "SeevPlus Multi-Pay",
                      badge: "Recommended",
                      color: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
                    },
                    {
                      id: "mtn" as const,
                      name: "MTN MoMo",
                      badge: "SeevPlus",
                      color: "bg-amber-500/10 border-amber-500/40 text-amber-300",
                    },
                    {
                      id: "telecel" as const,
                      name: "Telecel Cash",
                      badge: "Instant",
                      color: "bg-red-500/10 border-red-500/40 text-red-300",
                    },
                    {
                      id: "at" as const,
                      name: "AT Money",
                      badge: "Instant",
                      color: "bg-blue-500/10 border-blue-500/40 text-blue-300",
                    },
                    {
                      id: "card" as const,
                      name: "Visa / Card",
                      badge: "SeevPlus",
                      color: "bg-purple-500/10 border-purple-500/40 text-purple-300",
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all relative overflow-hidden",
                        method === m.id
                          ? "bg-[#F5C400] text-black border-[#F5C400] font-extrabold shadow-lg"
                          : "bg-[#1c1c24] border-[#2a2a38] text-gray-300 hover:border-gray-500",
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-black">{m.name}</span>
                        {method === m.id ? (
                          <CheckCircle2 className="h-4 w-4 text-black" />
                        ) : (
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", m.color)}>
                            {m.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Inputs */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Deposit Amount (GHS Cedis)</span>
                  <span className="text-xs font-mono font-bold text-[#F5C400]">{formatGHS(amount)}</span>
                </label>

                {/* Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_AMOUNTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(p)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                        amount === p
                          ? "bg-[#F5C400] text-black border-[#F5C400] font-black"
                          : "bg-[#1c1c24] border-[#2a2a38] text-gray-300 hover:bg-[#252532]",
                      )}
                    >
                      GHS {p}
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <div className="relative mt-2">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#F5C400] font-mono">
                    GHS
                  </span>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="Enter amount (e.g. 300)"
                    className="bg-[#1c1c24] border-[#2a2a38] text-white font-mono text-lg font-extrabold pl-14 h-12 rounded-xl focus:border-[#F5C400] focus:ring-0"
                  />
                </div>
              </div>

              {/* Network / Phone Details */}
              {method !== "card" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">
                    {getMethodName(method)} Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0205795789"
                      className="bg-[#1c1c24] border-[#2a2a38] text-white font-mono text-sm font-bold pl-10 h-11 rounded-xl focus:border-[#F5C400]"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">
                    A secure MoMo prompt or SeevPlus checkout will be initiated for this number.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 border-t border-[#2a2a38] pt-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-gray-300 uppercase">Card Number</label>
                    <Input
                      type="text"
                      placeholder="4000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="bg-[#1c1c24] border-[#2a2a38] text-white font-mono text-xs h-10 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-gray-300 uppercase">Expiry</label>
                      <Input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="bg-[#1c1c24] border-[#2a2a38] text-white font-mono text-xs h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-gray-300 uppercase">CVC</label>
                      <Input
                        type="text"
                        placeholder="123"
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="bg-[#1c1c24] border-[#2a2a38] text-white font-mono text-xs h-10 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-12 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mt-4"
              >
                <Zap className="h-4 w-4 fill-black" /> Pay {formatGHS(amount)} via SeevPlus
              </Button>
            </form>
          )}

          {step === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="h-12 w-12 text-[#F5C400] animate-spin" />
              <div>
                <h4 className="font-extrabold text-lg text-white">Connecting to SeevPlus...</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Initializing secure gateway session for {formatGHS(amount)}
                </p>
              </div>
            </div>
          )}

          {/* SeevPlus Live Checkout Redirect Step */}
          {step === "checkout_redirect" && (
            <div className="space-y-4 py-2">
              <div className="bg-[#1c1c24] border border-emerald-500/40 rounded-2xl p-4 space-y-3 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <ExternalLink className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-black text-base text-white">SeevPlus Checkout Opened</h4>
                  <p className="text-xs text-gray-300 mt-1">
                    Complete your payment of <span className="font-mono font-bold text-[#F5C400]">GHS {amount.toFixed(2)}</span> on the official SeevPlus secure page.
                  </p>
                </div>

                <div className="bg-[#14141a] p-3 rounded-xl text-left border border-[#2a2a38] space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Gateway:</span>
                    <span className="font-bold text-white">SeevPlus (SeevCash)</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Ref Code:</span>
                    <span className="font-mono text-gray-300 text-[10px] truncate max-w-[200px]">{txRef}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 items-center">
                    <span>Listening Status:</span>
                    <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                      <RefreshCw className={cn("h-3 w-3", isPolling && "animate-spin")} /> Awaiting settlement
                    </span>
                  </div>
                </div>

                {checkoutUrl && (
                  <Button
                    type="button"
                    onClick={() => window.open(checkoutUrl, "_blank")}
                    variant="outline"
                    className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Re-open SeevPlus Checkout
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleManualVerify}
                  className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-12 rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> I have completed payment — Verify
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetFlow}
                  className="w-full text-xs text-gray-400 hover:text-white"
                >
                  Cancel & Return
                </Button>
              </div>
            </div>
          )}

          {step === "prompt" && (
            <div className="space-y-4 py-2">
              <div className="bg-[#1c1c24] border border-[#F5C400]/40 rounded-2xl p-4 space-y-3 text-center">
                <div className="h-12 w-12 rounded-full bg-[#F5C400]/20 text-[#F5C400] mx-auto flex items-center justify-center animate-bounce">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-black text-base text-white">Mobile Money Prompt Sent</h4>
                  <p className="text-xs text-gray-300 mt-1">
                    An authorization request for <span className="font-mono font-bold text-[#F5C400]">GHS {amount.toFixed(2)}</span> has been sent to <span className="font-mono font-bold text-white">{phone}</span>.
                  </p>
                </div>
                <div className="bg-[#14141a] p-3 rounded-xl text-left border border-[#2a2a38] space-y-1 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Gateway:</span>
                    <span className="font-bold text-white">SeevPlus Gateway</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Amount:</span>
                    <span className="font-mono font-black text-[#F5C400]">GHS {amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Ref Code:</span>
                    <span className="font-mono text-gray-300 text-[10px]">{txRef}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider block text-center">
                  Enter 4-Digit MoMo PIN to Confirm
                </label>
                <Input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="bg-[#1c1c24] border-[#2a2a38] text-white font-mono text-center text-xl font-black tracking-[0.5em] h-12 rounded-xl focus:border-[#F5C400]"
                />
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleAuthorizePayment}
                  className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-12 rounded-xl uppercase tracking-wider shadow-lg"
                >
                  Approve & Pay GHS {amount.toFixed(2)}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetFlow}
                  className="w-full text-xs text-gray-400 hover:text-white"
                >
                  Cancel & Change Details
                </Button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center animate-in zoom-in-75">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h4 className="font-black text-2xl text-white">Deposit Confirmed!</h4>
                <p className="text-sm text-emerald-400 font-bold mt-1">
                  +GHS {amount.toFixed(2)} Credited to your wallet
                </p>
              </div>

              <div className="bg-[#1c1c24] border border-[#2a2a38] rounded-2xl p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between text-gray-400">
                  <span>Transaction Ref:</span>
                  <span className="font-mono text-gray-200 font-bold">{txRef}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Gateway Method:</span>
                  <span className="text-gray-200 font-medium">SeevPlus · {getMethodName(method)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>New Balance:</span>
                  <span className="font-mono text-[#F5C400] font-black text-sm">
                    {formatGHS(amount)} added
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => handleClose(false)}
                className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-11 rounded-xl uppercase tracking-wider shadow-md"
              >
                Done / Back to Platform
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock, Phone, Shield, Eye, EyeOff, X, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BetrixLogo } from "@/components/brand/Logo";
import { useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Register — BETRIX Sportsbook" },
      { name: "description", content: "Login to BETRIX or register a free account to bet on live sports." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useBetrix();
  const search = useSearch({ strict: false }) as { mode?: string; redirect?: string; ref?: string };
  const defaultTab = search?.mode === "signup" || search?.ref ? "signup" : "signin";

  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);
  const [loading, setLoading] = useState<null | "signin" | "signup">(null);

  // Form states
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // A code that arrived via a partner's link is fixed: the user can't clear or change it.
  const linkedReferral = (search?.ref || "").trim().toUpperCase();
  const [referralCode, setReferralCode] = useState(linkedReferral);
  const effectiveReferral = linkedReferral || referralCode.trim();

  const handleSubmit = (mode: "signin" | "signup") => async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || phone.trim().length < 9) {
      toast.error("Please enter a valid Ghana phone number.");
      return;
    }

    if (!password || password.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(mode);
    try {
      if (mode === "signup") {
        await register(phone.trim(), password, effectiveReferral || undefined);
        toast.success("Account created successfully!");
      } else {
        await login(phone.trim(), password);
        toast.success("Welcome back to BETRIX!");
      }
      void navigate({ to: search?.redirect || "/profile" });
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };


  return (
    <div className="min-h-screen bg-[#0e0e11] text-white flex flex-col justify-center items-center p-4 relative font-sans select-none">
      {/* Gold Top Header Glow */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#F5C400]/20 via-[#F5C400]/5 to-transparent pointer-events-none" />

      {/* Main Container Card (Primestakers Dark & Gold Theme) */}
      <div className="relative z-10 w-full max-w-md bg-[#16161c] border border-[#252532] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden my-6">
        {/* Close / Back button */}
        <Link
          to="/"
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-[#22222d] transition-all z-20"
          title="Close"
        >
          <X className="h-5 w-5" />
        </Link>

        {/* Card Header & Brand Logo */}
        <div className="pt-8 pb-4 px-6 text-center border-b border-[#22222d] bg-[#14141a]">
          <div className="flex justify-center mb-3">
            <BetrixLogo size="lg" />
          </div>
          <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">
            {tab === "signin" ? "Account Sign In" : "Create New Account"}
          </p>

          {/* Country Selector Indicator Bar */}
          <div className="mt-4 inline-flex items-center justify-between gap-3 w-full bg-[#1e1e28] border border-[#2b2b3a] px-3.5 py-2 rounded-xl text-xs font-bold text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-base">🇬🇭</span>
              <span className="font-extrabold text-white">Ghana</span>
            </div>
            <button type="button" className="text-[#F5C400] font-black text-[11px] hover:underline">
              Change ›
            </button>
          </div>
        </div>

        {/* Tabs & Forms Content */}
        <div className="p-6 space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2 bg-[#1f1f29] p-1 rounded-xl mb-6 border border-[#2b2b3a]">
              <TabsTrigger
                value="signin"
                className="data-[state=active]:bg-[#F5C400] data-[state=active]:text-black font-extrabold text-xs rounded-lg py-2.5 transition-all text-gray-400"
              >
                Log In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-[#F5C400] data-[state=active]:text-black font-extrabold text-xs rounded-lg py-2.5 transition-all text-gray-400"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* ── LOG IN FORM ── */}
            <TabsContent value="signin" className="space-y-4 outline-none">
              <form onSubmit={handleSubmit("signin")} className="space-y-4">
                {/* Phone Number Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Phone Number</label>
                  <div className="flex rounded-xl border border-[#2c2c3b] bg-[#1c1c24] overflow-hidden focus-within:border-[#F5C400] transition-all">
                    <div className="flex items-center gap-1.5 px-3 bg-[#242430] border-r border-[#2c2c3b] text-xs font-black text-white shrink-0">
                      <span>🇬🇭</span>
                      <span>+233</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="border-0 bg-transparent h-11 text-sm font-bold text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Password</label>
                  <div className="relative flex rounded-xl border border-[#2c2c3b] bg-[#1c1c24] overflow-hidden focus-within:border-[#F5C400] transition-all">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-0 bg-transparent h-11 text-sm font-bold text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 pr-10 pl-3"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Login Button */}
                <Button
                  type="submit"
                  className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-11 rounded-xl uppercase tracking-wider shadow-lg transition-all mt-2"
                  disabled={loading !== null}
                >
                  {loading === "signin" ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : "Login"}
                </Button>
              </form>

              {/* Sub-links */}
              <div className="flex items-center justify-between text-xs font-bold pt-2">
                <button type="button" className="text-gray-400 hover:text-[#F5C400] transition-colors">
                  Forgot Password?
                </button>
                <button type="button" onClick={() => setTab("signup")} className="text-[#F5C400] hover:underline">
                  Create New Account
                </button>
              </div>

              {/* Or Divider */}
              <div className="flex items-center gap-3 pt-3 text-xs font-bold text-gray-600">
                <div className="flex-1 h-px bg-[#262633]" />
                Or
                <div className="flex-1 h-px bg-[#262633]" />
              </div>

              <p className="text-[11px] text-center text-gray-400 font-medium pt-1">
                To deactivate or reactivate your account{" "}
                <button type="button" className="text-[#F5C400] font-bold hover:underline">
                  click here
                </button>
                .
              </p>
            </TabsContent>

            {/* ── REGISTER FORM ── */}
            <TabsContent value="signup" className="space-y-4 outline-none">
              <form onSubmit={handleSubmit("signup")} className="space-y-4">
                {/* Phone Number Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Phone Number</label>
                  <div className="flex rounded-xl border border-[#2c2c3b] bg-[#1c1c24] overflow-hidden focus-within:border-[#F5C400] transition-all">
                    <div className="flex items-center gap-1.5 px-3 bg-[#242430] border-r border-[#2c2c3b] text-xs font-black text-white shrink-0">
                      <span>🇬🇭</span>
                      <span>+233</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="border-0 bg-transparent h-11 text-sm font-bold text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Password</label>
                  <div className="relative flex rounded-xl border border-[#2c2c3b] bg-[#1c1c24] overflow-hidden focus-within:border-[#F5C400] transition-all">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-0 bg-transparent h-11 text-sm font-bold text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 pr-10 pl-3"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative flex rounded-xl border border-[#2c2c3b] bg-[#1c1c24] overflow-hidden focus-within:border-[#F5C400] transition-all">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-0 bg-transparent h-11 text-sm font-bold text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 pr-10 pl-3"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Partner Referral Code (Auto-populated from Partner's Unique Registration Link) */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <span>{linkedReferral ? "Partner Referral Code" : "Partner Referral Code (Optional)"}</span>
                    </label>
                    {effectiveReferral && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        ✓ Partner Code Applied
                      </span>
                    )}
                  </div>
                  {linkedReferral ? (
                    // Not an input: nothing to click, focus, clear or edit.
                    <div
                      aria-label={`Partner referral code ${linkedReferral} (applied from link, cannot be changed)`}
                      className="pointer-events-none select-none flex h-11 items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3"
                    >
                      <span className="font-mono text-sm font-bold text-white">{linkedReferral}</span>
                      <Lock className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="relative flex rounded-xl border border-[#2c2c3b] bg-[#1c1c24] overflow-hidden focus-within:border-[#F5C400] transition-all">
                      <Input
                        type="text"
                        placeholder="e.g. BTX-AMA"
                        aria-label="Partner referral code (optional)"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="border-0 bg-transparent h-11 text-sm font-mono font-bold text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 uppercase"
                      />
                    </div>
                  )}
                  {effectiveReferral && (
                    <p className="text-[11px] text-[#F5C400] font-medium">
                      You are registering through an official BETRIX Partner referral link ({effectiveReferral}).
                    </p>
                  )}
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start gap-2 text-xs text-gray-400 pt-1">
                  <input type="checkbox" id="terms" required className="mt-0.5 accent-[#F5C400]" />
                  <label htmlFor="terms" className="cursor-pointer">
                    I confirm that I am at least 18 years old and agree to the{" "}
                    <Link to="/partners" className="text-[#F5C400] font-bold hover:underline">
                      Terms & Conditions
                    </Link>.
                  </label>
                </div>

                {/* Primary Register Button */}
                <Button
                  type="submit"
                  className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-11 rounded-xl uppercase tracking-wider shadow-lg transition-all mt-2"
                  disabled={loading !== null}
                >
                  {loading === "signup" ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : "Create Account"}
                </Button>
              </form>

              {/* Sub-links */}
              <div className="flex items-center justify-between text-xs font-bold pt-2">
                <button type="button" className="text-gray-400 hover:text-[#F5C400] transition-colors">
                  Forgot Password?
                </button>
                <button type="button" onClick={() => setTab("signin")} className="text-[#F5C400] hover:underline">
                  Back to Login
                </button>
              </div>

              {/* Or Divider */}
              <div className="flex items-center gap-3 pt-3 text-xs font-bold text-gray-600">
                <div className="flex-1 h-px bg-[#262633]" />
                Or
                <div className="flex-1 h-px bg-[#262633]" />
              </div>

              <p className="text-[11px] text-center text-gray-400 font-medium pt-1">
                To deactivate or reactivate your account{" "}
                <button type="button" className="text-[#F5C400] font-bold hover:underline">
                  click here
                </button>
                .
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer info badge */}
        <div className="bg-[#14141a] p-4 border-t border-[#22222d] flex items-center justify-center gap-2 text-xs font-semibold text-gray-400">
          <Shield className="h-4 w-4 text-[#F5C400]" />
          <span>Licensed & Regulated · Free Virtual Betting · 18+</span>
        </div>
      </div>
    </div>
  );
}

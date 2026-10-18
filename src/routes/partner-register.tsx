import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Users2,
  DollarSign,
  TrendingUp,
  Share2,
  Send,
  Building2,
  Mail,
  Phone,
  Radio,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BetrixLogo, BetrixWordmark } from "@/components/brand/Logo";
import { useBetrix } from "@/store/betrix";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partner-register")({
  head: () => ({
    meta: [
      { title: "Partner & Affiliate Registration — BETRIX" },
      {
        name: "description",
        content:
          "Apply for the official BETRIX Partnership Program. Earn competitive commissions on every deposit made by your referred users.",
      },
    ],
  }),
  component: PartnerRegisterPage,
});

export function PartnerRegisterPage() {
  const navigate = useNavigate();
  const { registerPartner } = useBetrix();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("Telegram VIP Channel");
  const [channelLink, setChannelLink] = useState("");
  const [audienceSize, setAudienceSize] = useState("5,000 - 20,000 members");
  const [preferredCode, setPreferredCode] = useState("");
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPartner, setSubmittedPartner] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);

  // Clean code preview
  const formattedCodePreview = preferredCode.trim()
    ? preferredCode.toUpperCase().startsWith("BTX-")
      ? preferredCode.toUpperCase()
      : `BTX-${preferredCode.toUpperCase().replace(/[^A-Z0-9]/g, "")}`
    : "BTX-YOURCODE";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please provide your full name or brand name");
      return;
    }
    if (!phone.trim() || phone.length < 8) {
      toast.error("Please enter a valid Ghanaian mobile phone number");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!agreed) {
      toast.error("Please confirm acceptance of partner terms");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const partner = registerPartner({
        name,
        email,
        phone,
        channel,
        channelLink: channelLink.trim() || undefined,
        audienceSize,
        preferredCode: preferredCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setIsSubmitting(false);
      setSubmittedPartner({
        id: partner.id,
        name: partner.name,
        code: partner.code,
      });

      toast.success(
        "Application submitted! Awaiting administrator approval on dashboard."
      );
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white flex flex-col font-sans select-none relative">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-[#F5C400]/15 via-transparent to-transparent pointer-events-none blur-3xl" />

      {/* Header */}
      <header className="border-b border-[#1f1f28] bg-[#121217]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BetrixWordmark />
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/30 tracking-wider">
              Partners
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/partners"
              className="text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-[#1a1a24] transition-all"
            >
              Partner Portal
            </Link>
            <Link
              to="/admin"
              className="text-xs font-extrabold text-[#F5C400] border border-[#F5C400]/40 px-3 py-1.5 rounded-xl bg-[#F5C400]/10 hover:bg-[#F5C400]/20 transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 relative z-10">
        {submittedPartner ? (
          /* ── SUBMISSION SUCCESS & PENDING STATE ── */
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-[#15151c] border border-[#2b2b3a] rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <Clock className="h-8 w-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-widest text-[11px] px-3 py-1">
                  Application Under Review
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  Registration Received, {submittedPartner.name}!
                </h1>
                <p className="text-sm text-gray-300 max-w-lg mx-auto">
                  Your BETRIX partner application has been registered successfully.
                  An administrator must approve your application on the dashboard before
                  your unique registration link and commission earnings become active.
                </p>
              </div>

              {/* Account summary pill */}
              <div className="bg-[#1b1b24] border border-[#292936] rounded-2xl p-4 max-w-md mx-auto text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Assigned Partner Code:</span>
                  <span className="font-mono font-black text-[#F5C400] text-sm bg-[#121217] px-2 py-0.5 rounded-lg border border-[#2b2b3a]">
                    {submittedPartner.code}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Approval Status:</span>
                  <span className="inline-flex items-center gap-1 text-amber-400 font-extrabold text-xs">
                    <Clock className="h-3.5 w-3.5" /> Pending Admin Review
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Initial Commission Rate:</span>
                  <span className="text-gray-200 font-bold">10% — 15% (Confirmed on Approval)</span>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="p-4 rounded-2xl bg-[#1b1928] border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed text-left flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-white">Next Step: Administrator Dashboard Approval</p>
                  <p className="text-gray-400 mt-1">
                    Once approved by BETRIX Operations, you can sign in to the Partner Portal to view your real-time user deposit metrics, monitor earnings, and copy your unique link to send to your users.
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  asChild
                  className="w-full sm:w-auto bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-xs h-11 rounded-xl px-6 uppercase tracking-wider"
                >
                  <Link to="/admin">
                    <span>Admin Console (Approve Now)</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full sm:w-auto border-[#2b2b3a] bg-[#1a1a24] text-gray-200 font-bold text-xs h-11 rounded-xl px-5 hover:bg-[#232330]"
                >
                  <Link to="/partners">
                    <span>Preview Partner Portal</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ── APPLICATION FORM ── */
          <div className="space-y-6">
            {/* Top Value Banner */}
            <div className="bg-gradient-to-br from-[#1a192d] to-[#12111f] border border-[#2c274b] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/30 font-extrabold text-[10px] uppercase tracking-wider">
                  Official Partnership Program
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                  Ghanaian Cedis (GHS)
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Become a BETRIX Partner & Affiliate
              </h1>

              <p className="text-sm text-gray-300 leading-relaxed">
                Join Ghana's premier sportsbook affiliate network. Earn lifetime commission on every single deposit made by users who register through your unique partner registration link.
              </p>

              {/* Benefit highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-[#121024]/70 border border-[#272346] p-3 rounded-2xl flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#F5C400]/10 text-[#F5C400] flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">Up to 25% RevShare</p>
                    <p className="text-[10px] text-gray-400">On all user deposits</p>
                  </div>
                </div>

                <div className="bg-[#121024]/70 border border-[#272346] p-3 rounded-2xl flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">Live Tracking</p>
                    <p className="text-[10px] text-gray-400">Real-time GHS reporting</p>
                  </div>
                </div>

                <div className="bg-[#121024]/70 border border-[#272346] p-3 rounded-2xl flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">Unique User Links</p>
                    <p className="text-[10px] text-gray-400">Instant user attribution</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Form Card */}
            <div className="bg-[#15151c] border border-[#272736] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="border-b border-[#232330] pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-[#F5C400]" />
                  <span>Partner Application Form</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Provide your channel and contact information. Administrators review applications before activating referral links.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full / Brand Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#F5C400]" />
                    <span>Full Name or Brand Name *</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Kwame Mensah or Accra Betting Club"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#1b1b24] border-[#2c2c3b] text-white text-sm h-11 rounded-xl focus:border-[#F5C400]"
                  />
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-[#F5C400]" />
                      <span>Email Address *</span>
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="partner@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-[#1b1b24] border-[#2c2c3b] text-white text-sm h-11 rounded-xl focus:border-[#F5C400]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-[#F5C400]" />
                      <span>Ghana Mobile (MoMo) *</span>
                    </label>
                    <div className="flex rounded-xl border border-[#2c2c3b] bg-[#1b1b24] overflow-hidden focus-within:border-[#F5C400]">
                      <div className="flex items-center gap-1 px-3 bg-[#242432] text-xs font-bold text-white border-r border-[#2c2c3b] shrink-0">
                        <span>🇬🇭</span>
                        <span>+233</span>
                      </div>
                      <Input
                        type="tel"
                        required
                        placeholder="024 123 4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="border-0 bg-transparent h-11 text-sm font-bold text-white px-3 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Marketing Channel & Audience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-[#F5C400]" />
                      <span>Primary Promotional Channel</span>
                    </label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="w-full bg-[#1b1b24] border border-[#2c2c3b] text-white text-xs font-bold h-11 rounded-xl px-3 focus:outline-none focus:border-[#F5C400]"
                    >
                      <option value="Telegram VIP Channel">Telegram VIP / Predictions Channel</option>
                      <option value="WhatsApp Community">WhatsApp Sports Betting Group</option>
                      <option value="YouTube Sports Channel">YouTube Sports Analysis Channel</option>
                      <option value="Twitter / X Football Account">Twitter / X Sports Media Account</option>
                      <option value="TikTok Football Creator">TikTok Football / Betting Creator</option>
                      <option value="Sports Bar / Retail Shop">Sports Bar / Retail Viewing Center</option>
                      <option value="Website or Sports Blog">Sports Blog / Website</option>
                      <option value="Other Influencer Network">Other Word-of-Mouth Network</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">
                      Audience / Network Size
                    </label>
                    <select
                      value={audienceSize}
                      onChange={(e) => setAudienceSize(e.target.value)}
                      className="w-full bg-[#1b1b24] border border-[#2c2c3b] text-white text-xs font-bold h-11 rounded-xl px-3 focus:outline-none focus:border-[#F5C400]"
                    >
                      <option value="Under 1,000 followers">Under 1,000 members</option>
                      <option value="1,000 - 5,000 members">1,000 – 5,000 members</option>
                      <option value="5,000 - 20,000 members">5,000 – 20,000 members</option>
                      <option value="20,000 - 50,000 members">20,000 – 50,000 members</option>
                      <option value="50,000+ members">50,000+ members (VIP Partner)</option>
                    </select>
                  </div>
                </div>

                {/* Channel Link / Handle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">
                    Channel Link, Handle or URL (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. https://t.me/ghana_vip_bets or @AccraFootball"
                    value={channelLink}
                    onChange={(e) => setChannelLink(e.target.value)}
                    className="bg-[#1b1b24] border-[#2c2c3b] text-white text-sm h-11 rounded-xl focus:border-[#F5C400]"
                  />
                </div>

                {/* Preferred Referral Code */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">
                      Preferred Referral Code (Optional)
                    </label>
                    <span className="text-[11px] font-mono font-bold text-[#F5C400]">
                      Preview: {formattedCodePreview}
                    </span>
                  </div>
                  <Input
                    type="text"
                    placeholder="e.g. VIP, ACCRA, GHANA (Will be prefixed with BTX-)"
                    value={preferredCode}
                    onChange={(e) => setPreferredCode(e.target.value)}
                    className="bg-[#1b1b24] border-[#2c2c3b] text-white text-sm h-11 rounded-xl font-mono uppercase focus:border-[#F5C400]"
                  />
                  <p className="text-[11px] text-gray-400">
                    Your unique user registration link will be generated with this code once approved.
                  </p>
                </div>

                {/* Additional Strategy / Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">
                    Additional Information / Promotion Strategy (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tell us how you plan to introduce BETRIX to your audience..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#1b1b24] border border-[#2c2c3b] text-white text-xs rounded-xl p-3 focus:outline-none focus:border-[#F5C400] resize-none"
                  />
                </div>

                {/* Terms agreement checkbox */}
                <div className="flex items-start gap-2 pt-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    id="partnerTerms"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 accent-[#F5C400] h-4 w-4 rounded"
                  />
                  <label htmlFor="partnerTerms" className="cursor-pointer select-none leading-relaxed">
                    I confirm that I am at least 18 years old, and understand that my partner application must be{" "}
                    <span className="text-[#F5C400] font-bold">approved by an administrator on the dashboard</span>{" "}
                    before my partner portal access and unique referral links are enabled.
                  </label>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#F5C400] hover:bg-[#e0b300] text-black font-black text-sm h-12 rounded-xl uppercase tracking-wider shadow-lg transition-all mt-4 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Partnership Application</span>
                    </>
                  )}
                </Button>
              </form>

              {/* Notice footer */}
              <div className="bg-[#121217] p-3 rounded-xl border border-[#22222e] text-[11px] text-gray-400 flex items-center gap-2 justify-center">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Applications are usually reviewed within 1 to 24 hours by the BETRIX operations team.</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

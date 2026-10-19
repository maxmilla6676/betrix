import { useState, useEffect } from "react";
import {
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Zap,
  Info,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getApiSportsKey,
  setApiSportsKey,
  isApiSportsEnabled,
  setApiSportsEnabled,
  testApiSportsConnection,
  clearApiSportsCache,
  type ApiSportsAccountStatus,
} from "@/services/apiSports";
import { useBetrix } from "@/store/betrix";

export function ApiSportsSettingsCard() {
  const [apiKey, setApiKeyState] = useState("");
  const [isEnabled, setIsEnabledState] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<ApiSportsAccountStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { fetchApiMatches } = useBetrix();

  useEffect(() => {
    const key = getApiSportsKey();
    setApiKeyState(key);
    setIsEnabledState(isApiSportsEnabled());

    if (key) {
      testConnection(key);
    }
  }, []);

  const testConnection = async (keyToTest?: string) => {
    setIsTesting(true);
    try {
      const res = await testApiSportsConnection(keyToTest || apiKey);
      setStatus(res);
      if (res.success) {
        toast.success(`Connected to API-Sports! ${res.requestsRemaining} requests left today.`);
      } else {
        toast.error(`Connection failed: ${res.error || "Check your API key"}`);
      }
    } catch (e: any) {
      setStatus({ success: false, error: e.message || "Failed to reach API" });
      toast.error("Failed to test API connection");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKey = () => {
    const trimmed = apiKey.trim();
    setApiSportsKey(trimmed);
    if (trimmed) {
      setApiSportsEnabled(true);
      setIsEnabledState(true);
      toast.success("API-Sports key saved! Testing connection...");
      testConnection(trimmed);
    } else {
      setApiSportsEnabled(false);
      setIsEnabledState(false);
      setStatus(null);
      toast.info("API key removed. BETRIX will use free fallback feeds.");
    }
  };

  const handleToggleEnabled = () => {
    const next = !isEnabled;
    if (next && !apiKey.trim()) {
      toast.error("Please enter and save an API-Sports key first");
      return;
    }
    setApiSportsEnabled(next);
    setIsEnabledState(next);
    toast.success(next ? "API-Sports set as primary data feed" : "Switched to free fallback feeds");
  };

  const handleClearCache = () => {
    clearApiSportsCache();
    toast.success("Fixtures cache cleared! Next fetch will pull fresh data from the API.");
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    clearApiSportsCache();
    try {
      await fetchApiMatches();
      toast.success("Fixtures synchronized with live API!");
      // re-check quota
      testConnection(apiKey);
    } catch {
      toast.error("Failed to sync matches");
    } finally {
      setIsSyncing(false);
    }
  };

  const requestsUsed = status?.requestsUsed ?? 0;
  const requestsLimit = status?.requestsLimit ?? 100;
  const usedPct = requestsLimit > 0 ? Math.min(100, Math.round((requestsUsed / requestsLimit) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-[#2a2a35] bg-[#121216] p-4 md:p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a35] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E41B23]/10 border border-[#E41B23]/20 text-[#E41B23]">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">API-Football (api-sports.io) Integration</h3>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase",
                  status?.success && isEnabled
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : apiKey
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-gray-700 bg-gray-800 text-gray-400"
                )}
              >
                {status?.success && isEnabled ? "Live Active" : apiKey ? "Configured" : "Not Set"}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Connect your authentic fixtures, real bookmaker odds, and official club crests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://dashboard.api-sports.io/register"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a35] bg-[#1a1a22] px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white hover:border-[#3a3a48] transition-colors"
          >
            <span>Get Free Key</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <Button
            type="button"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="h-8 text-xs font-bold bg-[#E41B23] hover:bg-[#c0141e] text-white flex items-center gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </Button>
        </div>
      </div>

      {/* API Key Configuration Form */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-[#F5C400]" />
            API-Sports Application Key (v3)
          </span>
          <span className="text-[11px] font-normal text-gray-500">
            Stored securely in local storage & environment
          </span>
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Paste your 32-character API key (e.g. 8f6b...)"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              className="bg-[#1a1a22] border-[#2a2a35] text-white font-mono text-xs placeholder:text-gray-500 h-9 pr-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSaveKey}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save Key
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => testConnection()}
              disabled={isTesting || !apiKey.trim()}
              className="h-9 px-3 text-xs font-bold border-[#2a2a35] text-gray-300 hover:text-white hover:bg-[#1e1e26]"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isTesting && "animate-spin")} />
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </div>
      </div>

      {/* Account Status & Quota Details */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status Box */}
          <div className="p-3.5 rounded-xl border border-[#2a2a35] bg-[#1a1a22] space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              {status.success ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              )}
              Connection Status
            </span>
            <p className={cn("text-sm font-black", status.success ? "text-emerald-400" : "text-red-400")}>
              {status.success ? "Verified & Active" : "Authentication Failed"}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{status.email || status.error || "Ready"}</p>
          </div>

          {/* Plan Info */}
          <div className="p-3.5 rounded-xl border border-[#2a2a35] bg-[#1a1a22] space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#F5C400]" />
              Account Plan
            </span>
            <p className="text-sm font-black text-white">{status.plan || "Free Developer"}</p>
            <p className="text-[11px] text-gray-500">{status.requestsLimit || 100} requests daily allowance</p>
          </div>

          {/* Daily Quota Counter */}
          <div className="p-3.5 rounded-xl border border-[#2a2a35] bg-[#1a1a22] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-gray-400 uppercase tracking-wider">Today's Quota</span>
              <span className={cn("font-mono font-black", usedPct >= 85 ? "text-red-400" : "text-[#F5C400]")}>
                {requestsUsed} / {requestsLimit} reqs
              </span>
            </div>

            <div className="w-full bg-[#262632] h-2 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  usedPct >= 90 ? "bg-red-500" : usedPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${usedPct}%` }}
              />
            </div>

            <p className="text-[10px] text-gray-500">
              {status.requestsRemaining ?? 100} requests left until midnight UTC reset
            </p>
          </div>
        </div>
      )}

      {/* Smart Caching & Quota Protection Banner */}
      <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-blue-300">Intelligent 8-Minute Quota Shield Active</span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              BETRIX caches fixtures for 8 minutes and live games for 45s so your free 100 requests/day quota is never wasted by browsing or page refreshes.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          className="h-7 text-[11px] font-bold border-blue-500/30 text-blue-300 hover:bg-blue-500/10 shrink-0"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear Cache
        </Button>
      </div>

      {/* Feed Source Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#2a2a35]">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[#F5C400]" />
            Feed Mode: {isEnabled ? "API-Sports (Primary)" : "Free ESPN Feed (Fallback)"}
          </span>
          <p className="text-[11px] text-gray-500">
            {isEnabled
              ? "Pulling authentic fixtures, club logos, and bookmaker odds from API-Football."
              : "Using free public ESPN fixtures and calculated mathematical odds."}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleToggleEnabled}
          className={cn(
            "h-8 text-xs font-bold border",
            isEnabled
              ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              : "border-gray-700 text-gray-400 hover:text-white"
          )}
        >
          {isEnabled ? "Switch to Free Fallback" : "Enable API-Sports"}
        </Button>
      </div>
    </div>
  );
}

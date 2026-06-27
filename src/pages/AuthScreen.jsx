import React, { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { authService } from "../services/auth";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await authService.signIn(email, password);
      if (signInError) throw signInError;
    } catch (e) {
      let msg = e.message || "Sign in failed.";
      if (msg.includes("Invalid login credentials")) {
        msg = "Incorrect email or password. Please check your details and try again.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle = (name) => ({
    width: "100%",
    background: focusedField === name
      ? "rgba(0,0,0,0.55)"
      : "rgba(0,0,0,0.32)",
    border: `1.5px solid ${focusedField === name
      ? "rgba(6,182,212,0.55)"
      : "rgba(255,255,255,0.09)"}`,
    boxShadow: focusedField === name
      ? "0 0 0 3.5px rgba(6,182,212,0.11), 0 2px 12px rgba(0,0,0,0.25)"
      : "0 1px 4px rgba(0,0,0,0.2)",
    borderRadius: 16,
    padding: "15px 18px",
    fontSize: 15,
    fontFamily: "inherit",
    fontWeight: 500,
    color: "white",
    outline: "none",
    transition: "all 0.22s cubic-bezier(0.32,0.72,0,1)",
    WebkitAppearance: "none",
    appearance: "none",
  });

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      background: "linear-gradient(160deg, #080514 0%, #07040f 40%, #080c18 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "-20%", left: "10%",
          width: "55vw", height: "55vw", maxWidth: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}/>
        <div style={{
          position: "absolute", bottom: "5%", right: "-10%",
          width: "50vw", height: "50vw", maxWidth: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)",
          filter: "blur(36px)",
        }}/>
      </div>

      <div style={{
        width: "100%", maxWidth: 400,
        position: "relative", zIndex: 1,
        animation: "slideUp 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        {/* App Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{
            width: 76, height: 76,
            borderRadius: 22,
            background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 60%, #a855f7 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(99,102,241,0.5), 0 2px 0 rgba(255,255,255,0.15) inset",
          }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.57 21 3 14.43 3 6c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.26.2 2.48.57 3.61.11.35.03.74-.27 1.01L6.6 10.8z"
                fill="white" fillOpacity="0.95"/>
            </svg>
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{
            fontSize: 32, fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.1,
            background: "linear-gradient(90deg, #fff 20%, #a5f3fc 55%, #c4b5fd 90%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: 0, marginBottom: 10,
          }}>
            CallTrack Pro
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", fontWeight: 500, margin: 0 }}>
            Sign in to your team workspace
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(28px) saturate(1.4)",
          WebkitBackdropFilter: "blur(28px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 26,
          padding: "28px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
        }}>
          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "#fca5a5",
              fontWeight: 500,
              lineHeight: 1.5,
              animation: "slideUp 0.22s ease both",
            }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Email field */}
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 7 }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="you@example.com"
                style={fieldStyle("email")}
                autoComplete="email"
              />
            </div>

            {/* Password field */}
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  style={{ ...fieldStyle("password"), paddingRight: 50 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  style={{
                    position: "absolute", right: 16, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    color: "rgba(255,255,255,0.35)", cursor: "pointer",
                    padding: 4, display: "flex",
                  }}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "16px",
                borderRadius: 18,
                border: "none",
                background: loading
                  ? "rgba(6,182,212,0.4)"
                  : "linear-gradient(135deg, #06b6d4 0%, #6366f1 60%, #a855f7 100%)",
                color: "white",
                fontSize: 15,
                fontWeight: 800,
                fontFamily: "inherit",
                letterSpacing: "0.01em",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading
                  ? "none"
                  : "0 6px 24px rgba(99,102,241,0.45), 0 1px 0 rgba(255,255,255,0.15) inset",
                transition: "all 0.22s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onMouseDown={e => !loading && (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              {loading && <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} />}
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          marginTop: 22,
          textAlign: "center",
          fontSize: 12,
          color: "rgba(255,255,255,0.28)",
          fontWeight: 500,
          lineHeight: 1.6,
        }}>
          🔒 Secured team workspace · New accounts created via Supabase Dashboard
        </p>
      </div>
    </div>
  );
}

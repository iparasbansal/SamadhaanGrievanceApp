// 🌐 React Core
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

// 💫 Animation & Icons
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Mail,
  Lock,
  User,
  Smartphone,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  ChevronRight
} from "lucide-react";

// API Services
import { forgotPassword, resetPassword } from "../services/api";

// Reusable custom Form Input component with left icon and optional right element
const FormInput = ({ icon: Icon, rightElement, ...props }) => {
  return (
    <div className="relative group w-full">
      {Icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-200">
          <Icon size={18} />
        </div>
      )}
      <input
        {...props}
        className={`w-full rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm ${
          Icon ? "pl-11" : "px-4"
        } ${
          rightElement ? "pr-11" : "pr-4"
        } py-3 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500/50 transition-all duration-300 shadow-sm`}
      />
      {rightElement && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {rightElement}
        </div>
      )}
    </div>
  );
};

function AuthPage() {
  const { login, register, skipLogin } = useAuth();
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup" | "forgot"
  const [resetStep, setResetStep] = useState(1); // 1: send email, 2: reset password

  // Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authMode === "login") {
        await login(email, password);
      } else if (authMode === "signup") {
        await register({
          firstName,
          lastName,
          email,
          password,
          mobile,
          departmentCode,
        });
      } else if (authMode === "forgot") {
        if (resetStep === 1) {
          const res = await forgotPassword(email);
          setSuccessMessage(res.msg || "Password reset link sent to your email!");
          setResetStep(2);
          setPassword(""); // Clear password field for step 2 input
        } else {
          const res = await resetPassword(email, password);
          setSuccessMessage(res.msg || "Password updated successfully!");
          setTimeout(() => {
            setAuthMode("login");
            setSuccessMessage(null);
            setPassword("");
            setResetStep(1);
          }, 2500);
        }
      }
    } catch (err) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (mode) => {
    setAuthMode(mode);
    setError(null);
    setSuccessMessage(null);
    setResetStep(1);
    setPassword("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-sky-50/60 p-4">
      {/* Animated Glowing Orbs Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 20, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-r from-emerald-400/20 to-teal-400/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-r from-sky-400/25 to-blue-400/10 blur-3xl"
        />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-panel-strong relative z-10 w-full max-w-md overflow-visible rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-white/90"
      >
        {/* Glowing border outline */}
        <div className="absolute inset-0 rounded-3xl -z-10 border border-emerald-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 p-3 shadow-md"
          >
            <Globe className="h-full w-full text-white" />
          </motion.div>

          <h2 className="font-space-grotesk mt-4 bg-gradient-to-r from-emerald-800 to-sky-700 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            {authMode === "login"
              ? "Welcome Back"
              : authMode === "signup"
              ? "Create Account"
              : "Reset Password"}
          </h2>

          <p className="text-slate-500 text-sm mt-2 font-medium px-4">
            {authMode === "login"
              ? "Access the civic grievance resolution portal"
              : authMode === "signup"
              ? "Join the digital smart grievance initiative"
              : resetStep === 1
              ? "Recover access using your registered email"
              : "Enter your new credentials below"}
          </p>
        </div>

        {/* Sliding Pill Tab Switcher */}
        {authMode !== "forgot" && (
          <div className="relative flex rounded-2xl bg-slate-100/90 p-1.5 mb-6 border border-slate-200/40">
            <motion.div
              className="absolute bottom-1.5 top-1.5 rounded-xl bg-white shadow-[0_2px_8px_rgba(16,185,129,0.08)]"
              initial={false}
              animate={{
                left: authMode === "login" ? "6px" : "calc(50% + 2px)",
                width: "calc(50% - 8px)",
              }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
            <button
              type="button"
              onClick={() => handleModeSwitch("login")}
              className={`relative z-10 w-1/2 py-2 text-center text-sm font-bold transition-colors duration-300 ${
                authMode === "login" ? "text-emerald-700" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("signup")}
              className={`relative z-10 w-1/2 py-2 text-center text-sm font-bold transition-colors duration-300 ${
                authMode === "signup" ? "text-emerald-700" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Inline Alerts */}
        <div className="mb-5 empty:hidden space-y-3">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-3 rounded-2xl border border-red-200/80 bg-red-50/90 p-4 text-xs text-red-700 backdrop-blur-md shadow-[0_4px_12px_rgba(239,68,68,0.04)]"
              >
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="flex-1">
                  <span className="font-bold block mb-0.5">Authentication Error</span>
                  <p className="leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/95 p-4 text-xs text-emerald-800 backdrop-blur-md shadow-[0_4px_12px_rgba(16,185,129,0.04)]"
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <span className="font-bold block mb-0.5">Success</span>
                  <p className="leading-relaxed">{successMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {authMode === "signup" && (
              <motion.div
                key="signupFields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 overflow-visible"
              >
                <div className="flex gap-3">
                  <FormInput
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    icon={User}
                    required
                  />
                  <FormInput
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    icon={User}
                    required
                  />
                </div>

                <FormInput
                  type="tel"
                  placeholder="Mobile Number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  icon={Smartphone}
                />

                <FormInput
                  type="password"
                  placeholder="Authority Code (Optional)"
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                  icon={KeyRound}
                />
              </motion.div>
            )}

            {authMode === "forgot" && resetStep === 1 && (
              <motion.div
                key="forgotStep1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <FormInput
                  type="email"
                  placeholder="Registered Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={Mail}
                  required
                />
              </motion.div>
            )}

            {authMode === "forgot" && resetStep === 2 && (
              <motion.div
                key="forgotStep2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-500 animate-pulse" />
                  <span>Email verified: <b>{email}</b> (Simulated Link)</span>
                </div>
                <FormInput
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                  required
                  minLength={6}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </motion.div>
            )}

            {authMode !== "forgot" && (
              <motion.div
                key="commonFields"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <FormInput
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={Mail}
                  required
                />

                <div className="space-y-1.5">
                  <FormInput
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={Lock}
                    required
                    minLength={6}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  {authMode === "login" && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => handleModeSwitch("forgot")}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              className="w-full rounded-xl bg-gradient-primary py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/10 hover:opacity-95 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                "Processing..."
              ) : authMode === "login" ? (
                <>Sign In <ChevronRight size={16} /></>
              ) : authMode === "signup" ? (
                <>Register Account <ChevronRight size={16} /></>
              ) : resetStep === 1 ? (
                <>Send Recovery Link <ChevronRight size={16} /></>
              ) : (
                <>Reset Password <ChevronRight size={16} /></>
              )}
            </motion.button>

            {authMode === "forgot" && (
              <button
                type="button"
                onClick={() => handleModeSwitch("login")}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors py-1 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={13} /> Back to Sign In
              </button>
            )}

            {authMode !== "forgot" && (
              <motion.button
                type="button"
                onClick={skipLogin}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.01 }}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 shadow-sm"
              >
                Explore as Guest
              </motion.button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default AuthPage;

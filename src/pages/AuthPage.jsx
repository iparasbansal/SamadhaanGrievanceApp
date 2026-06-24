// 🌐 React Core
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

// 💫 Animation
import { motion, AnimatePresence } from "framer-motion";

import { Button, Input, Modal } from "../components/ui";
import { Globe } from "lucide-react";


function AuthPage() {
  const { login, register, skipLogin } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "info",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register({
          firstName,
          lastName,
          email,
          password,
          mobile,
          departmentCode
        });
      }
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-emerald-400/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 animate-pulse rounded-full bg-sky-400/20 blur-3xl delay-300"></div>
      </div>

      {/* Modals */}
      <Modal show={!!error} onClose={() => setError(null)} title="Authentication Error" type="error">
        <p>{error}</p>
      </Modal>
      <Modal
        show={modal.show}
        title={modal.title}
        type={modal.type}
        onClose={() => setModal((prev) => ({ ...prev, show: false }))}
      >
        <p>{modal.message}</p>
      </Modal>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        whileHover={{ scale: 1.01 }}
        className="glass-panel-strong relative z-10 w-full max-w-md overflow-visible rounded-2xl p-8"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Globe className="h-10 w-10 text-emerald-500 drop-shadow-md" />
          </motion.div>

          <motion.h2 className="font-space-grotesk mt-4 bg-gradient-to-r from-emerald-700 to-sky-700 bg-clip-text text-3xl font-extrabold text-transparent">
            {isLoginMode ? "Welcome Back" : "Create Account"}
          </motion.h2>

          <p className="text-slate-600 text-sm mt-2">
            {isLoginMode
              ? "Access your grievance dashboard"
              : "Join our civic problem-solving platform"}
          </p>
        </div>

        {/* Form */}
        <motion.form
          key={isLoginMode ? "loginForm" : "signupForm"}
          className="space-y-5 relative z-10 overflow-visible"
          onSubmit={handleSubmit}
        >
          <AnimatePresence mode="wait">
            {!isLoginMode && (
              <motion.div
                key="signupFields"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex gap-3">
                  <Input 
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <Input 
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <Input 
                  type="tel"
                  placeholder="Mobile Number (optional)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />

                <Input 
                  type="password"
                  placeholder="Authority / Super Admin Code (optional)"
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Common Inputs */}
          <Input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.03 }}
            className="w-full rounded-lg bg-gradient-primary py-3 font-semibold text-white shadow-md transition-all duration-300 hover:opacity-90"
          >
            {loading
              ? "Processing..."
              : isLoginMode
              ? "Sign In"
              : "Register"}
          </motion.button>

          {/* Skip Button */}
            <motion.button
                type="button"
                onClick={skipLogin}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                className="w-full rounded-lg border border-emerald-100 bg-white py-3 font-semibold text-slate-800 shadow-md transition-all duration-300 hover:bg-emerald-50"
            >
                Skip
            </motion.button>

          {/* Toggle Mode */}
          <p className="mt-3 text-center text-sm text-slate-500">
            {isLoginMode ? "New here?" : "Already have an account?"}{" "}
            <span
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="cursor-pointer text-emerald-600 hover:text-emerald-500"
            >
              {isLoginMode ? "Create one" : "Sign in"}
            </span>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}

export default AuthPage;

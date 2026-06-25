// 🌐 React Core
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { useAuth } from "../context/AuthContext";
import { getGrievances } from "../services/api";
import {
  Award,
  Shield,
  Zap,
  Lock,
  Unlock,
  Sparkles,
  BarChart3,
  User,
  Mail,
  Fingerprint,
} from "lucide-react";

function ProfilePage() {
  const { user, firstName, token } = useAuth();
  const [stats, setStats] = useState({ total: 0, resolved: 0, progress: 0, pending: 0, upvotes: 0 });
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch user complaint stats
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getGrievances(1, 100, token, user.id)
      .then((data) => {
        const resolved = data.filter((c) => c.status === "Resolved").length;
        const progress = data.filter((c) => c.status === "In Progress").length;
        const pending = data.filter((c) => c.status === "Submitted" || c.status === "Pending").length;
        const totalUpvotes = data.reduce((sum, g) => sum + (g.upvotes || 0), 0);
        setStats({
          total: data.length,
          resolved,
          progress,
          pending,
          upvotes: totalUpvotes,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [user, token]);

  if (!user) {
    return (
      <div className="text-center py-20 text-slate-500">
        Please log in to view your profile.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16 text-slate-800">
        <div className="skeleton-shimmer h-48 rounded-2xl" />
        <div className="grid md:grid-cols-[1fr_340px] gap-6">
          <div className="skeleton-shimmer h-48 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer h-24 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Gamification: Calculate XP and Level
  // 100 XP per grievance submitted, 150 additional XP per grievance resolved
  const totalXP = stats.total * 100 + stats.resolved * 150;
  const xpPerLevel = 500;
  const level = Math.floor(totalXP / xpPerLevel) + 1;
  const currentXP = totalXP % xpPerLevel;
  const progressPercent = (currentXP / xpPerLevel) * 100;

  const getRankName = (lvl) => {
    if (lvl === 1) return "Novice Observer";
    if (lvl === 2) return "Active Reporter";
    if (lvl === 3) return "Civic Guardian";
    if (lvl === 4) return "Neighborhood Sentinel";
    return "Civic Champion";
  };

  const badges = [
    {
      id: "registered",
      name: "Civic Scholar",
      desc: "Registered an account on Samadhaan.",
      icon: Shield,
      unlocked: true,
      color: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
    },
    {
      id: "first_report",
      name: "First Responder",
      desc: "Filed your first public grievance report.",
      icon: Zap,
      unlocked: stats.total >= 1,
      color: "bg-amber-500/10 text-amber-700 border-amber-200",
    },
    {
      id: "resolved_hero",
      name: "Community Hero",
      desc: "Fled a complaint that was successfully resolved.",
      icon: Award,
      unlocked: stats.resolved >= 1,
      color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    },
    {
      id: "active_patrol",
      name: "Civic Sentinel",
      desc: "Submitted 5 or more municipal complaints.",
      icon: Sparkles,
      unlocked: stats.total >= 5,
      color: "bg-violet-500/10 text-violet-700 border-violet-200",
    },
    {
      id: "solved_master",
      name: "Metropolis Savior",
      desc: "Reported 3 or more issues that are now resolved.",
      icon: Award,
      unlocked: stats.resolved >= 3,
      color: "bg-rose-500/10 text-rose-700 border-rose-200",
    },
  ];

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-8 pb-16 text-slate-800"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      {/* Visual Header Banner */}
      <div className="glass-panel-strong relative overflow-hidden p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-white/40 to-sky-500/10" />
        
        {/* User Badge Info */}
        <div className="relative flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
            {firstName?.slice(0, 1) || user.email.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="font-space-grotesk text-2xl font-extrabold text-white">
              {firstName || "Citizen"}
            </h2>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mt-1 flex items-center gap-1.5 justify-center md:justify-start">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
              {getRankName(level)}
            </p>
          </div>
        </div>

        {/* Level and XP Meter */}
        <div className="w-full md:w-[320px] glass-panel p-4 rounded-2xl shadow-sm relative">
          <div className="flex justify-between items-center mb-2 text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wide">Level {level}</span>
            <span className="font-mono font-bold text-slate-450">{currentXP} / {xpPerLevel} XP</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <motion.div
              className="h-full bg-gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 text-right">
            Level up unlocks new community achievements
          </span>
        </div>
      </div>

      {/* Profile Details & Stats */}
      <div className="grid md:grid-cols-[1fr_340px] gap-6">
        {/* Profile Card */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="font-space-grotesk text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Account Details
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3 text-sm">
              <User className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <div className="flex-1 flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-semibold text-slate-800">{firstName || "N/A"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-slate-50 pb-3 text-sm">
              <Mail className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <div className="flex-1 flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">{user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-1 text-sm">
              <Fingerprint className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <div className="flex-1 flex justify-between">
                <span className="text-slate-500">Unique ID</span>
                <span className="font-mono text-xs text-slate-500">{user.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Total Filed", value: stats.total, color: "from-cyan-500 to-blue-600" },
            { label: "Resolved", value: stats.resolved, color: "from-emerald-500 to-emerald-600" },
            { label: "In Progress", value: stats.progress, color: "from-amber-500 to-amber-600" },
            { label: "Pending", value: stats.pending, color: "from-slate-600 to-slate-700" },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="glass-panel p-4 text-center flex flex-col justify-center items-center"
            >
              <div className="text-3xl font-extrabold font-space-grotesk text-slate-900">{item.value}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Civic Trust Card */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="glass-panel-strong p-6 relative overflow-hidden border border-emerald-200/60 shadow-[0_12px_36px_rgba(16,185,129,0.12)]"
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 opacity-80" />
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 block">Civic Standing</span>
            <h3 className="font-space-grotesk text-xl font-bold text-slate-900">Civic Trust Score</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
              Your trust score measures your active, verified civic contributions. You earn <strong className="text-emerald-700 font-bold">+20 points</strong> per grievance filed, <strong className="text-emerald-700 font-bold">+15 points</strong> per signal boost (upvote) received from the community, and <strong className="text-emerald-700 font-bold">+50 points</strong> when your reported issues are successfully resolved.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-emerald-50/50 border border-emerald-100/70 px-6 py-4 rounded-2xl">
            <div className="h-11 w-11 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-200">
              <Sparkles className="h-5.5 w-5.5 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <span className="text-3xl font-extrabold text-slate-900 font-space-grotesk tracking-tight tabular-nums block">
                {stats.total * 20 + stats.resolved * 50 + stats.upvotes * 15}
              </span>
              <span className="text-[9px] uppercase tracking-wider block text-slate-500 font-extrabold mt-0.5">Trust Points</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Achievement Badges Grid */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Award className="h-5 w-5 text-emerald-600" />
          <h3 className="font-space-grotesk text-lg font-bold text-slate-900">
            Civic Achievements
          </h3>
          <span className="ml-auto text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            {badges.filter((b) => b.unlocked).length} / {badges.length} Unlocked
          </span>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: badge.unlocked ? 1.02 : 1 }}
                className={`relative rounded-2xl border p-4 flex gap-3 transition-all duration-300 ${
                  badge.unlocked
                    ? `${badge.color} shadow-sm cursor-pointer`
                    : "border-slate-800 bg-slate-950/40 opacity-60 grayscale"
                }`}
              >
                {/* Lock/Unlock status overlay */}
                <div className="absolute right-3 top-3">
                  {badge.unlocked ? (
                    <Unlock className="h-3.5 w-3.5 opacity-45 text-emerald-400" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 opacity-30 text-slate-450" />
                  )}
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-800">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-white">
                    {badge.name}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {badge.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default ProfilePage;

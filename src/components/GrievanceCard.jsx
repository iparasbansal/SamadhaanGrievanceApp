import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { updateGrievance, getImageUrl } from '../services/api';
import DepartmentAdminTools from './DepartmentAdminTools';
import { Badge } from './ui';
import { ThumbsUp, MapPin, MoreHorizontal, Zap, CheckCircle2, CircleDot } from 'lucide-react';
import confetti from 'canvas-confetti';

const PIPELINE = ['Submitted', 'In Progress', 'Resolved'];

export function LiveTrace({ status }) {
  const activeIndex = Math.max(
    0,
    PIPELINE.findIndex((s) => s === status)
  );
  return (
    <div className="relative mt-3 border-t border-slate-800 pt-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Progress trace</p>
      <div className="flex items-center gap-1">
        {PIPELINE.map((step, i) => {
          const done = i <= activeIndex;
          const current = i === activeIndex;
          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${
                    done
                      ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                      : 'border-slate-800 bg-slate-950 text-slate-500'
                  }`}
                  animate={current ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 1.6, repeat: current ? Infinity : 0 }}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3 w-3" />}
                </motion.div>
                <span className={`hidden text-[9px] uppercase sm:block ${done ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {step.split(' ')[0]}
                </span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className="mx-0.5 h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent">
                  <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: '0%' }}
                    animate={{ width: i < activeIndex ? '100%' : '0%' }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrievanceCard({
  grievance,
  index,
  isAuthority,
  currentUserId,
  showToast,
  getDistanceKm,
  userLocation,
  onGrievanceUpdate,
  onCardClick,
}) {
  const { token } = useAuth();
  const [localUpvotes, setLocalUpvotes] = useState(grievance.upvotes || 0);
  const upvotedList = grievance.upvotedBy || [];
  const [isUpvoted, setIsUpvoted] = useState(upvotedList.includes(currentUserId));
  const [upvoting, setUpvoting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [quickLoading, setQuickLoading] = useState(null);

  const distance =
    userLocation && grievance.location ? getDistanceKm(userLocation, grievance.location) : null;

  const isCritical = grievance.aiPriority === 'Critical' || grievance.aiPriority === 'High';

  const borderClass = useMemo(() => {
    if (grievance.aiPriority === 'Critical') return 'neon-edge-crimson border-red-950/40';
    if (grievance.aiPriority === 'High') return 'neon-edge-amber border-amber-950/40';
    if (grievance.status === 'Resolved') return 'neon-edge-emerald border-emerald-950/40';
    if (grievance.status === 'In Progress') return 'neon-edge-amber border-amber-950/40';
    return 'border-slate-800';
  }, [grievance.aiPriority, grievance.status]);

  const handleUpvote = async (e) => {
    e.stopPropagation();
    if (isAuthority || upvoting) return;
    setUpvoting(true);
    try {
      const newCount = isUpvoted ? localUpvotes - 1 : localUpvotes + 1;
      const nextUpvotedBy = isUpvoted
        ? upvotedList.filter((id) => id !== currentUserId)
        : [...upvotedList, currentUserId];

      await updateGrievance(grievance._id, { upvotes: newCount, upvotedBy: nextUpvotedBy }, token);

      showToast(isUpvoted ? 'Signal retracted' : 'Signal boosted', 'success');
      if (!isUpvoted) {
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#10b981', '#0ea5e9', '#34d399', '#22d3ee']
        });
      }
      setLocalUpvotes(newCount);
      setIsUpvoted(!isUpvoted);
      onGrievanceUpdate?.({
        ...grievance,
        upvotes: newCount,
        upvotedBy: nextUpvotedBy,
      });
    } catch (error) {
      console.error('Upvote failed:', error);
    } finally {
      setUpvoting(false);
    }
  };

  const quickSetStatus = async (e, newStatus) => {
    e.stopPropagation();
    if (!isAuthority || quickLoading) return;
    if (newStatus === 'Resolved' && !grievance.resolutionPhoto?.url) {
      showToast('Open details and upload a solved photo before resolving.', 'error');
      return;
    }
    setQuickLoading(newStatus);
    try {
      const updatedGrievance = await updateGrievance(grievance._id, { status: newStatus }, token);
      showToast(`Status → ${newStatus}`, 'success');
      onGrievanceUpdate?.(updatedGrievance);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, scale: 1.015 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22, delay: index * 0.03 }}
        className={`glass-panel relative overflow-hidden p-5 border ${borderClass} cursor-pointer group/card flex flex-col justify-between`}
        onClick={(e) => {
          if (onCardClick) {
            onCardClick(e, grievance);
          } else {
            setShowDetails(true);
          }
        }}
      >
        {/* Glow overlay on hover */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/0 via-transparent to-sky-500/0 opacity-0 group-hover/card:opacity-100 group-hover/card:from-emerald-500/6 group-hover/card:to-sky-500/6 transition-all duration-500 pointer-events-none" />

        {isCritical && grievance.aiPriority === 'Critical' && (
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-400/10 blur-2xl" />
        )}
        
        {grievance.citizenPhoto?.url ? (
          <div className="relative -mx-5 -mt-5 mb-4 h-36 overflow-hidden rounded-t-2xl border-b border-slate-800 bg-slate-950">
            <img
              src={getImageUrl(grievance.citizenPhoto.url)}
              alt={grievance.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-102"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
          </div>
        ) : (
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-primary opacity-70" />
        )}

        <div className="relative z-10">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-space-grotesk line-clamp-2 text-base font-bold leading-snug text-slate-100">{grievance.title}</h3>
            <Badge
              variant={
                grievance.status === 'Resolved'
                  ? 'success'
                  : grievance.status === 'In Progress'
                    ? 'warning'
                    : 'default'
              }
            >
              {grievance.status}
            </Badge>
          </div>

          <p className="line-clamp-3 text-sm text-slate-300">{grievance.description}</p>

          {grievance.location && (
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="truncate">
                {grievance.location.address?.split(',')[0] || 'Unknown'}
                {distance !== null && Number.isFinite(distance) && (
                  <span className="text-slate-500"> · {distance.toFixed(1)} km</span>
                )}
              </span>
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-md border border-slate-850 bg-slate-900/60 px-2 py-0.5 text-slate-300">
              {grievance.category || 'Unassigned'}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 ${
                grievance.aiPriority === 'Critical'
                  ? 'border-red-500/30 bg-red-950/20 text-red-400'
                  : grievance.aiPriority === 'High'
                    ? 'border-amber-500/30 bg-amber-950/20 text-amber-400'
                    : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400'
              }`}
            >
              {grievance.aiPriority || 'Pending'}
            </span>
          </div>

          <LiveTrace status={grievance.status} />

          <div className="mt-4 flex items-center justify-between">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleUpvote}
              disabled={upvoting || isAuthority}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isUpvoted
                  ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${isUpvoted ? 'fill-current' : ''}`} />
              {localUpvotes}
            </motion.button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(true);
              }}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              View Details
            </button>
          </div>
        </div>

        {isAuthority && (
          <div className="relative z-10 mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-2 backdrop-blur-sm">
            <div className="flex items-center justify-between px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <MoreHorizontal className="h-3 w-3" /> Quick actions
              </span>
              <Zap className="h-3 w-3 text-amber-400" />
            </div>
            <div className="flex flex-wrap gap-1">
              {['Submitted', 'In Progress', 'Resolved'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => quickSetStatus(e, s)}
                  disabled={!!quickLoading}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase transition ${
                    s === 'Resolved'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20 hover:bg-emerald-950/60'
                      : s === 'In Progress'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500/20 hover:bg-amber-950/60'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                  } disabled:opacity-50`}
                >
                  {quickLoading === s ? '...' : s}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              className="glass-panel-strong max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 text-slate-200 border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-space-grotesk text-xl font-bold text-white">{grievance.title}</h2>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">{grievance.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Department</span>
                  <p className="text-slate-200 font-medium mt-0.5">{grievance.category}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Priority</span>
                  <p className="text-slate-200 font-medium mt-0.5">{grievance.aiPriority}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Status</span>
                  <p className="text-slate-200 font-medium mt-0.5">{grievance.status}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Solved proof</span>
                  <p className="text-slate-200 font-medium mt-0.5">{grievance.resolutionPhoto?.url ? 'Uploaded' : 'Required to resolve'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Signals</span>
                  <p className="text-slate-200 font-medium mt-0.5">{localUpvotes} boosts</p>
                </div>
              </div>

              {grievance.summary && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 mt-4 text-xs text-slate-300">
                  <span className="font-bold text-emerald-400 block mb-1">AI summary</span>
                  <p className="leading-relaxed">{grievance.summary}</p>
                </div>
              )}

              {grievance.location?.address && (
                <div className="mt-4 text-xs text-slate-300">
                  <span className="text-emerald-400 font-bold block mb-1">Location</span>
                  <p className="text-slate-400 leading-relaxed">{grievance.location.address}</p>
                </div>
              )}

              <LiveTrace status={grievance.status} />

              {grievance.citizenPhoto?.url && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  <img
                    src={getImageUrl(grievance.citizenPhoto.url)}
                    alt="Grievance proof"
                    className="max-h-64 w-full object-cover"
                  />
                  <p className="px-3 py-2 text-[10px] text-slate-500">
                    Citizen photo proof
                    {grievance.citizenPhoto.uploadedAt
                      ? ` · ${new Date(grievance.citizenPhoto.uploadedAt).toLocaleString('en-IN')}`
                      : ''}
                  </p>
                </div>
              )}

              {grievance.resolutionPhoto?.url && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  <img
                    src={getImageUrl(grievance.resolutionPhoto.url)}
                    alt="Solved proof"
                    className="max-h-64 w-full object-cover"
                  />
                  <p className="px-3 py-2 text-[10px] text-slate-500">
                    Solved photo proof
                    {grievance.resolutionPhoto.uploadedAt
                      ? ` · ${new Date(grievance.resolutionPhoto.uploadedAt).toLocaleString('en-IN')}`
                      : ''}
                  </p>
                </div>
              )}

              <DepartmentAdminTools
                grievance={grievance}
                isAuthority={isAuthority}
                showToast={showToast}
                onGrievanceUpdate={onGrievanceUpdate}
              />

              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="btn-primary mt-6 w-full !py-2.5"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default GrievanceCard;

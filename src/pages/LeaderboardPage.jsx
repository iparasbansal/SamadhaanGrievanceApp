// 🌐 React Core
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getGrievances } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GlobalSpinner } from '../components/ui';
import {
  Trophy,
  Search,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const CITIZEN_BADGES = [
  { limit: 500, label: 'Civic Elite 🌟', color: 'text-amber-500 bg-amber-50 border-amber-200/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
  { limit: 200, label: 'Civic Leader ✨', color: 'text-teal-600 bg-teal-50 border-teal-200/50' },
  { limit: 50, label: 'Active Citizen 🛡️', color: 'text-sky-600 bg-sky-50 border-sky-200/50' },
  { limit: 0, label: 'Novice Reporter 🌱', color: 'text-slate-500 bg-slate-50 border-slate-200/50' }
];

const getBadge = (score) => {
  return CITIZEN_BADGES.find((b) => score >= b.limit) || CITIZEN_BADGES[CITIZEN_BADGES.length - 1];
};

function LeaderboardPage() {
  const { token } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setLoading(true);
    getGrievances(1, 200, token)
      .then((data) => {
        setGrievances(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load grievances for leaderboard:', err);
        setError('Failed to calculate leader standings.');
        setLoading(false);
      });
  }, [token]);

  // Aggregate and sort citizens
  const citizensList = useMemo(() => {
    const map = {};
    grievances.forEach((g) => {
      const uid = g.submitterUserId;
      if (!uid) return;
      const name = g.submitterName || 'Anonymous Citizen';

      if (!map[uid]) {
        map[uid] = {
          name,
          total: 0,
          resolved: 0,
          upvotes: 0,
        };
      }

      if (name && name !== 'Anonymous' && name !== 'Anonymous Citizen') {
        map[uid].name = name;
      }

      map[uid].total++;
      if (g.status === 'Resolved') map[uid].resolved++;
      map[uid].upvotes += g.upvotes || 0;
    });

    return Object.entries(map)
      .map(([id, v]) => {
        const score = v.total * 20 + v.resolved * 50 + v.upvotes * 15;
        return {
          id,
          name: v.name,
          total: v.total,
          resolved: v.resolved,
          upvotes: v.upvotes,
          score,
          badge: getBadge(score)
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [grievances]);

  // Filtered list based on search
  const filteredCitizens = useMemo(() => {
    if (!searchQuery.trim()) return citizensList;
    const query = searchQuery.toLowerCase();
    return citizensList.filter(
      (c) => c.name.toLowerCase().includes(query) || c.badge.label.toLowerCase().includes(query)
    );
  }, [citizensList, searchQuery]);

  // Paginated list
  const totalPages = Math.ceil(filteredCitizens.length / itemsPerPage);
  const paginatedCitizens = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCitizens.slice(start, start + itemsPerPage);
  }, [filteredCitizens, currentPage]);

  if (loading) {
    return <GlobalSpinner message="Aggregating civic scores..." />;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 space-y-8">
      {/* Top Banner */}
      <motion.div
        className="glass-panel-strong relative overflow-hidden p-6 lg:p-8"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-white/40 to-sky-500/10" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-700">
              Citizen Standing
            </p>
            <h1 className="font-space-grotesk bg-gradient-to-r from-slate-900 via-emerald-700 to-sky-700 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-5xl flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500 drop-shadow-[0_4px_12px_rgba(245,158,11,0.3)] shrink-0" />
              Citizen Hero Board
            </h1>
            <p className="max-w-xl text-xs md:text-sm font-medium text-slate-600">
              Ranks are computed dynamically from citizen participation: 
              <span className="font-semibold text-emerald-700 ml-1">20 pts</span> per case filed, 
              <span className="font-semibold text-emerald-700 ml-1">50 pts</span> per resolution, and 
              <span className="font-semibold text-emerald-700 ml-1">15 pts</span> per community boost.
            </p>
          </div>
          <div className="relative w-full max-w-xs shrink-0">
            <input
              type="text"
              placeholder="Search citizens..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="input-dark w-full py-2.5 pl-10 pr-4 text-sm"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </motion.div>

      {/* Main Ranking Table Card */}
      <motion.div
        className="glass-panel-strong overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 opacity-90" />
        
        {error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredCitizens.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <Award className="h-12 w-12 text-slate-300" />
            <p className="text-sm font-semibold">No citizen records found.</p>
            <p className="text-xs text-slate-400">Be the first to file or upvote a grievance to get on the board!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-emerald-100 bg-slate-50/70 font-semibold text-slate-500">
                  <th className="px-6 py-4 text-center">Rank</th>
                  <th className="px-6 py-4">Citizen Hero</th>
                  <th className="px-6 py-4 text-center">Trust Score</th>
                  <th className="px-6 py-4 text-center">Filed Cases</th>
                  <th className="px-6 py-4 text-center">Resolved</th>
                  <th className="px-6 py-4 text-center">Signal Boosts</th>
                  <th className="px-6 py-4">Badge Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCitizens.map((citizen, i) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + i;
                  const medal = globalIndex === 0 ? "🥇" : globalIndex === 1 ? "🥈" : globalIndex === 2 ? "🥉" : null;
                  
                  return (
                    <motion.tr
                      key={citizen.id}
                      className="hover:bg-slate-50/50 transition duration-150"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td className="px-6 py-4 text-center">
                        {medal ? (
                          <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] block">{medal}</span>
                        ) : (
                          <span className="font-mono font-bold text-slate-500 text-xs">
                            #{globalIndex + 1}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span>{citizen.name}</span>
                          {globalIndex < 3 && (
                            <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-space-grotesk text-sm font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/30">
                          {citizen.score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-semibold text-slate-600">
                        {citizen.total}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-semibold text-teal-600">
                        {citizen.resolved}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-semibold text-sky-600">
                        {citizen.upvotes}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${citizen.badge.color}`}>
                          {citizen.badge.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <span className="text-xs text-slate-500 font-medium">
              Showing page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({filteredCitizens.length} total citizens)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary !p-1.5 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary !p-1.5 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default LeaderboardPage;

// 🌐 React Core
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "../context/AuthContext";
import { getGrievances, deleteGrievance, getImageUrl } from "../services/api";
import { Trash } from "lucide-react";

function MyComplaintsPage({ onNavigate }) {
  const { user, token } = useAuth();
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null); 

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getGrievances(1, 100, token, user.id)
      .then(data => {
        setMyComplaints(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user, token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this grievance permanently?")) return;
    try {
      await deleteGrievance(id, token);
      setMyComplaints(myComplaints.filter(c => c._id !== id));
      showToast("🗑️ Deleted successfully.", "success");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to delete grievance.", "error");
    }
  };

  const sortedComplaints = [...myComplaints]
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "priority") {
        const priorityOrder = { Critical: 1, High: 2, Medium: 3, Low: 4, Pending: 5 };
        return (priorityOrder[a.aiPriority] || 6) - (priorityOrder[b.aiPriority] || 6);
      }
      return 0;
    })
    .filter((c) =>
      filterStatus === "all" ? true : c.status?.toLowerCase() === filterStatus.toLowerCase()
    );

  if (loading)
    return <div className="text-center py-16 text-cyan-300 animate-pulse">Loading your complaints...</div>;


  return (
    <motion.div
      className="min-h-screen pb-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ✅ Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium shadow-lg z-50 ${
              toast.type === "success" ? "bg-emerald-600/90" : "bg-rose-600/90"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
          My Complaints
        </h2>

        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-dark px-3 py-2 rounded-lg"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">By Priority</option>
          </select>

          <div className="flex gap-2">
            {["all", "resolved", "in progress", "submitted"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-sm rounded-lg border transition-all duration-200 ${
                    filterStatus === status
                      ? "bg-cyan-500/80 border-cyan-400 text-white"
                      : "bg-gray-50 border-gray-100 text-slate-700 hover:border-cyan-400/40"
                  }`}
              >
                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* No Complaints */}
      {sortedComplaints.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No complaints found for this filter.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedComplaints.map((g) => (
            <motion.div
              key={g._id}
              whileHover={{ scale: 1.03 }}
              onClick={() => setSelectedComplaint(g)} // ✅ Open details modal
              className={`relative rounded-2xl glass-panel p-6 pt-10 text-slate-800 cursor-pointer shadow-md transition-all duration-300 hover:shadow-lg`}
            >
              <div
                className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold border border-gray-100 shadow-md ${
                  g.aiPriority === "Critical"
                    ? "bg-rose-500/90"
                    : g.aiPriority === "High"
                    ? "bg-amber-500/90 text-black"
                    : g.aiPriority === "Medium"
                    ? "bg-cyan-500/90 text-black"
                    : g.aiPriority === "Low"
                    ? "bg-emerald-500/90 text-black"
                    : "bg-gray-50 text-slate-700"
                }`}
              >
                {g.aiPriority || "Pending"}
              </div>

              <h3 className="text-lg font-semibold mb-2 text-slate-900">{g.title}</h3>
              <p className="text-sm text-slate-700 mb-3 line-clamp-3">{g.description}</p>

              <div className="flex justify-between text-xs text-slate-300 mb-3">
                <span>📅 {new Date(g.createdAt).toLocaleDateString()}</span>
                <span
                  className={`font-semibold ${
                    g.status === "Resolved"
                      ? "text-emerald-300"
                      : g.status === "In Progress"
                      ? "text-amber-300"
                      : "text-rose-300"
                  }`}
                >
                  {g.status}
                </span>
              </div>

              {/* Delete Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(g._id);
                }}
                className="absolute bottom-3 right-3 bg-gray-50 hover:bg-rose-50 text-slate-700 rounded-full p-1"
                title="Delete grievance"
              >
                <Trash className="h-4 w-4" />
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}

      {/* 🧠 Expanded Modal for selected complaint */}
      <AnimatePresence>
        {selectedComplaint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl rounded-2xl glass-panel p-6 relative shadow-lg text-slate-200"
            >
              <button
                onClick={() => setSelectedComplaint(null)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg"
              >
                ✖
              </button>

              <h2 className="text-2xl font-semibold mb-3 text-white">{selectedComplaint.title}</h2>
              <p className="text-slate-300 text-sm mb-4">{selectedComplaint.description}</p>

              <p className="text-sm text-slate-300 mb-3">
                <strong className="text-slate-100">🧠 AI Summary:</strong>{" "}
                {selectedComplaint.summary || "AI is still analyzing this grievance..."}
              </p>

              {selectedComplaint.location && selectedComplaint.location.address && (
                <p className="text-sm text-slate-300 mb-3">
                  <strong className="text-slate-100">📍 Location:</strong>{" "}
                  {selectedComplaint.location.address}
                </p>
              )}

              <p className="text-sm text-slate-300">
                <strong className="text-slate-100">⚡ Priority:</strong>{" "}
                {selectedComplaint.aiPriority || "Pending"}
              </p>
              <p className="text-sm text-slate-300">
                <strong className="text-slate-100">🏢 Department:</strong>{" "}
                {selectedComplaint.category || "Unassigned"}
              </p>

              {selectedComplaint.citizenPhoto?.url && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
                  <img
                    src={getImageUrl(selectedComplaint.citizenPhoto.url)}
                    alt="Grievance proof"
                    className="max-h-72 w-full object-cover"
                  />
                  <p className="px-3 py-2 text-xs text-slate-400">
                    Citizen photo proof
                    {selectedComplaint.citizenPhoto.uploadedAt
                      ? ` · ${new Date(selectedComplaint.citizenPhoto.uploadedAt).toLocaleString("en-IN")}`
                      : ""}
                  </p>
                </div>
              )}

              {selectedComplaint.resolutionPhoto?.url && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
                  <img
                    src={getImageUrl(selectedComplaint.resolutionPhoto.url)}
                    alt="Solved proof"
                    className="max-h-72 w-full object-cover"
                  />
                  <p className="px-3 py-2 text-xs text-slate-400">
                    Solved photo proof
                    {selectedComplaint.resolutionPhoto.uploadedAt
                      ? ` · ${new Date(selectedComplaint.resolutionPhoto.uploadedAt).toLocaleString("en-IN")}`
                      : ""}
                  </p>
                </div>
              )}

              <p className="text-sm text-slate-400 mt-3">
                Created:{" "}
                {new Date(selectedComplaint.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Button */}
      <div className="mt-12 flex justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => (onNavigate ? onNavigate("dashboard") : window.location.reload())}
          className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-lg font-semibold hover:from-cyan-400 hover:to-indigo-400 shadow-md"
        >
          ← Back to Dashboard
        </motion.button>
      </div>
    </motion.div>
  );
}

export default MyComplaintsPage;

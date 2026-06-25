// 🌐 React Core
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateGrievance, deleteGrievance, getImageUrl } from "../services/api";
import { Button } from "./ui";

// 🎨 Icons
import {
  ImageUp,
  Loader2,
  Settings,
  RefreshCw,
  Trash
} from "lucide-react";

const readImageAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

// --- NEW Component: DepartmentAdminTools (For Status Updates) ---
function DepartmentAdminTools({ grievance, isAuthority, showToast, onGrievanceUpdate }) {
    const { token, user } = useAuth();
    const [status, setStatus] = useState(grievance.status);
    const [resolutionPhoto, setResolutionPhoto] = useState(grievance.resolutionPhoto || null);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(grievance.resolutionPhoto?.url || "");

    const handlePhotoSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast("Please upload an image file.", "error");
            return;
        }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleStatusChange = async (newStatus) => {
        if (status === newStatus || loading) return;
        if (newStatus === "Resolved" && !selectedFile && !resolutionPhoto?.url) {
            showToast("Upload a solved photo before marking this resolved.", "error");
            return;
        }

        setLoading(true);
        try {
            const payload = { status: newStatus };

            if (newStatus === "Resolved" && selectedFile) {
                payload.resolutionPhoto = {
                    url: await readImageAsDataUrl(selectedFile),
                    name: selectedFile.name,
                    uploadedBy: user?.id || user?._id || user?.email || "",
                };
            }

            const updatedGrievance = await updateGrievance(grievance._id, payload, token);
            setStatus(updatedGrievance.status);
            setResolutionPhoto(updatedGrievance.resolutionPhoto || null);
            setSelectedFile(null);
            setPreviewUrl(updatedGrievance.resolutionPhoto?.url || "");
            onGrievanceUpdate?.(updatedGrievance);
            showToast(`Status updated to: ${newStatus}`, "success");
        } catch (error) {
            console.error("Status update failed:", error);
            showToast(error.message || "Failed to update status.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to permanently delete this grievance? This cannot be undone.")) return;
        
        setLoading(true);
        try {
            await deleteGrievance(grievance._id, token);
            showToast("Grievance permanently deleted.", "success");
            // You might want to refresh the grievances list on the parent component
        } catch (error) {
            console.error("Deletion failed:", error);
            showToast("Failed to delete grievance.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthority) return null;

    return (
        <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                <Settings className="h-4 w-4" /> Admin Tools
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">
                <ImageUp className="h-4 w-4" />
                {selectedFile ? selectedFile.name : resolutionPhoto?.url ? "Replace solved photo" : "Upload solved photo"}
                <input type="file" accept="image/*" onChange={handlePhotoSelect} className="sr-only" />
            </label>

            {(previewUrl || resolutionPhoto?.url) && (
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
                    <img
                        src={previewUrl || getImageUrl(resolutionPhoto.url)}
                        alt="Solved proof"
                        className="max-h-44 w-full object-cover"
                    />
                </div>
            )}
            
            {/* Status Update Buttons */}
            <div className="flex flex-wrap gap-2">
                {["Submitted", "In Progress", "Resolved"].map((s) => (
                    <Button
                        key={s}
                        size="sm"
                        variant={s === status ? "upvoted" : "secondary"}
                        onClick={() => handleStatusChange(s)}
                        disabled={loading || (s === "Resolved" && !selectedFile && !resolutionPhoto?.url)}
                        className={`text-xs ${s === "Resolved" ? 'bg-emerald-600 hover:bg-emerald-700' : s === "In Progress" ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-600 hover:bg-slate-700'}`}
                        title={s === "Resolved" && !selectedFile && !resolutionPhoto?.url ? "Upload a solved photo first" : undefined}
                    >
                        {loading && s === status ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                        {s}
                    </Button>
                ))}
            </div>

            {/* Delete Button */}
            <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="text-xs"
            >
                <Trash className="h-4 w-4 mr-1" /> Delete
            </Button>
        </div>
    );
}

export default DepartmentAdminTools;

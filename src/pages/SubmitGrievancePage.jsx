// 🌐 React Core
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "../context/AuthContext";
import { createGrievance } from "../services/api";
import { analyzeGrievanceWithAI } from "../services/gemini";
import { Button, Input, Textarea, Modal } from "../components/ui";
import MapPickerModal from "../components/MapPickerModal";
import { MapPin, Sparkles, AlertTriangle, ShieldCheck, HelpCircle, Image, X } from "lucide-react";
import confetti from 'canvas-confetti';

function SubmitGrievancePage({ onGrievanceSubmitted }) {
  const { user, token, isAuthenticated } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, title: "", message: "", type: "info" });
  const [showMapModal, setShowMapModal] = useState(false);

  // Citizen Image Attachment States
  const [citizenPhoto, setCitizenPhoto] = useState(null);
  const [citizenPhotoName, setCitizenPhotoName] = useState("");
  const [citizenPhotoPreview, setCitizenPhotoPreview] = useState("");

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setModal({ show: true, title: "Error", message: "Please select an image file.", type: "error" });
      return;
    }
    
    setCitizenPhotoName(file.name);
    setCitizenPhotoPreview(URL.createObjectURL(file));

    // Read the file as a base64 string
    const reader = new FileReader();
    reader.onload = () => {
      setCitizenPhoto(reader.result);
    };
    reader.onerror = (err) => {
      console.error("File reading error:", err);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setCitizenPhoto(null);
    setCitizenPhotoName("");
    setCitizenPhotoPreview("");
  };

  // AI Assist States
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Debounced real-time AI classification
  useEffect(() => {
    if (title.trim().length < 5 || description.trim().length < 10) {
      setAiSuggestions(null);
      return;
    }

    setAiLoading(true);
    const handler = setTimeout(async () => {
      try {
        const data = await analyzeGrievanceWithAI(title, description);
        setAiSuggestions(data);
      } catch (err) {
        console.error("AI Assist error:", err);
      } finally {
        setAiLoading(false);
      }
    }, 1500);

    return () => clearTimeout(handler);
  }, [title, description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setModal({ show: true, title: "Error", message: "You must be logged in to submit a grievance.", type: "error" });
      return;
    }
    if (!title || !description) {
      setModal({ show: true, title: "Error", message: "Title and description are required.", type: "error" });
      return;
    }
    if (!location) {
      setModal({ show: true, title: "Location Missing", message: "Please map the location of the grievance.", type: "error" });
      return;
    }
    setLoading(true);

    try {
      // Use pre-fetched AI predictions if available, else fetch fresh
      let aiData = aiSuggestions;
      if (!aiData) {
        aiData = await analyzeGrievanceWithAI(title, description);
      }

      const newGrievance = {
        title,
        description,
        location,
        submitterUserId: user.id,
        submitterName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0] : 'Citizen',
        citizenPhoto,
        ...aiData,
      };

      await createGrievance(newGrievance, token);

      setModal({ show: true, title: "Success", message: "Grievance submitted successfully!", type: "success" });
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTitle("");
      setDescription("");
      setLocation(null);
      setCitizenPhoto(null);
      setCitizenPhotoName("");
      setCitizenPhotoPreview("");
      setAiSuggestions(null);
      if (onGrievanceSubmitted) onGrievanceSubmitted();
    } catch (error) {
      console.error("Grievance submission error:", error);
      setModal({ show: true, title: "Error", message: "Failed to submit grievance.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation);
    setShowMapModal(false);
  };

  return (
    <>
      <motion.div
        className="glass-panel-strong hover-lift mx-auto max-w-2xl rounded-2xl p-8 text-slate-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-emerald-700">
          Civic intake
        </p>
        <h2 className="font-space-grotesk mb-6 bg-gradient-to-r from-emerald-700 to-sky-700 bg-clip-text text-center text-3xl font-extrabold text-transparent">
          Submit a New Grievance
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</label>
            <Input
              type="text"
              placeholder="Short, clear title (e.g. Broken water mains at Sector 5)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Details</label>
            <Textarea
              placeholder="Describe the problem, its exact spot, and how it is affecting the community..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
            />
          </div>
          
          {/* Location Picker Display */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Grievance Location</label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Button type="button" variant="outline" onClick={() => setShowMapModal(true)} className="!rounded-xl border-dashed">
                <MapPin className="mr-2 h-4 w-4 text-emerald-600" />
                {location ? "Re-pin Location" : "Pin on Map"}
              </Button>
              
              {location && (
                <div className="glass-panel flex items-start gap-3 p-3 text-xs w-full">
                  <MapPin className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">Pinned Spot:</span>
                    <p className="text-slate-600 mt-0.5">{location.address}</p>
                    <span className="font-mono text-[10px] text-slate-400">
                      Coordinates: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Citizen Photo Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Attach Photo Proof (Optional)</label>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-100 bg-white px-4 py-3.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
                <Image className="h-4.5 w-4.5 text-emerald-600" />
                {citizenPhotoName ? citizenPhotoName : "Upload image of the issue"}
                <input type="file" accept="image/*" onChange={handlePhotoSelect} className="sr-only" />
              </label>

              {citizenPhotoPreview && (
                <div className="relative mt-2 max-w-[200px] overflow-hidden rounded-xl border border-emerald-100 bg-white">
                  <img
                    src={citizenPhotoPreview}
                    alt="Preview"
                    className="max-h-44 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute right-2 top-2 rounded-full bg-slate-900/60 p-1 text-white hover:bg-slate-900 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Assistance Panel */}
          <AnimatePresence>
            {(aiLoading || aiSuggestions) && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.96 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 23 }}
                className="overflow-hidden origin-top"
              >
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      {aiLoading ? "AI Classification pending…" : "AI Classification Preview"}
                    </span>
                  </div>

                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce delay-150" />
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce delay-300" />
                      <span className="ml-2 font-medium">Predicting category and urgency…</span>
                    </div>
                  ) : (
                    aiSuggestions && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block font-semibold">Predicted Department</span>
                          <span className="mt-1 inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                            {aiSuggestions.category}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-semibold">Suggested Urgency</span>
                          <span className={`mt-1 inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold ${
                            aiSuggestions.aiPriority === "Critical"
                              ? "border-red-200 bg-red-50 text-red-600 animate-pulse"
                              : aiSuggestions.aiPriority === "High"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}>
                            {aiSuggestions.aiPriority}
                          </span>
                        </div>
                        <div className="col-span-2 border-t border-emerald-100/50 pt-2">
                          <span className="text-slate-500 block font-semibold">Generated Summary Preview</span>
                          <p className="text-slate-600 mt-1 leading-relaxed">
                            {aiSuggestions.summary}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button type="submit" disabled={loading} className="w-full !rounded-xl !py-3">
            {loading ? "Submitting..." : "Submit Grievance"}
          </Button>
        </form>
      </motion.div>

      <Modal
        show={modal.show}
        title={modal.title}
        type={modal.type}
        onClose={() => setModal({ ...modal, show: false })}
      >
        <p>{modal.message}</p>
      </Modal>

      <MapPickerModal
        show={showMapModal}
        onClose={() => setShowMapModal(false)}
        onSelect={handleLocationSelect}
        position={location}
      />
    </>
  );
}

export default SubmitGrievancePage;

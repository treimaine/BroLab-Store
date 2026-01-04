import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";
import { Calendar, CheckCircle, FileText, Loader2, Music, Settings, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CUSTOM_BEAT_BASE_PRICE,
  getDeliveryTime,
  getPriorityFee,
  getPriorityPrice,
} from "./CustomBeatRequestConstants";
import { PriorityCard } from "./CustomBeatRequestHelpers";
import { createFileUploadHandlers, type FileUploadState } from "./FileUploadHandlers";
import { validateBeatRequestFile } from "./FileValidation";

export interface CustomBeatRequestProps {
  readonly onSubmit: (request: BeatRequest) => void;
  readonly isSubmitting?: boolean;
}

interface BeatRequest {
  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // Beat Specifications
  genre: string;
  subGenre?: string;
  bpm: number;
  key: string;
  mood: string[];
  instruments: string[];
  duration: number;
  description: string;
  referenceTrack?: string;
  budget: number;
  deadline: string;
  revisions: number;
  priority: "standard" | "priority" | "express";
  additionalNotes?: string;
  uploadedFiles?: File[];
}

const genres = ["Hip Hop", "Trap", "R&B", "Pop", "Electronic", "Rock", "Jazz", "Classical"];

const subGenres = {
  "Hip Hop": ["Boom Bap", "Lo-Fi", "Old School", "Conscious", "Gangsta"],
  Trap: ["Hard Trap", "Melodic Trap", "Future Trap", "Dark Trap"],
  "R&B": ["Contemporary R&B", "Neo Soul", "Alternative R&B", "Smooth R&B"],
  Electronic: ["House", "Techno", "Dubstep", "Ambient", "Synthwave"],
};

const moods = [
  "Energetic",
  "Chill",
  "Dark",
  "Uplifting",
  "Emotional",
  "Aggressive",
  "Romantic",
  "Mysterious",
  "Nostalgic",
  "Motivational",
];

const instruments = [
  "Piano",
  "Guitar",
  "Bass",
  "Strings",
  "Brass",
  "Flute",
  "Saxophone",
  "Synthesizer",
  "Drums",
  "Vocals",
  "Percussion",
];

const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function CustomBeatRequest({ onSubmit, isSubmitting = false }: CustomBeatRequestProps) {
  const { toast } = useToast();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [request, setRequest] = useState<BeatRequest>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    genre: "",
    bpm: 120,
    key: "",
    mood: [],
    instruments: [],
    duration: 180,
    description: "",
    budget: CUSTOM_BEAT_BASE_PRICE,
    deadline: "",
    revisions: 2,
    priority: "standard",
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({ isUploading: false });

  // Create file upload handlers
  const fileUploadHandlers = createFileUploadHandlers(setFileUploadState, setUploadedFiles, toast);

  // Auto-fill form data when user data is available
  useEffect(() => {
    if (clerkLoaded && clerkUser) {
      // Extract first and last name from fullName
      const fullName = clerkUser.fullName || "";
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Only update fields that are currently empty to avoid overwriting user input
      setRequest(prev => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: prev.email || clerkUser.emailAddresses[0]?.emailAddress || "",
        phone: prev.phone || clerkUser.phoneNumbers?.[0]?.phoneNumber || "",
      }));
    }
  }, [clerkLoaded, clerkUser]);

  // Form validation state
  const [isValidating, setIsValidating] = useState(false);

  const validateFormData = async (): Promise<boolean> => {
    setIsValidating(true);
    try {
      // Validate contact information
      if (!request.firstName || !request.lastName || !request.email || !request.phone) {
        toast({
          title: "Validation Error",
          description: "Please fill in all contact information fields",
          variant: "destructive",
        });
        return false;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return false;
      }

      // Validate required fields
      if (!request.genre || !request.key || request.mood.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (Genre, Key, and at least one Mood)",
          variant: "destructive",
        });
        return false;
      }

      // Validate file uploads if any
      if (uploadedFiles.length > 0) {
        const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
        const maxTotalSize = 200 * 1024 * 1024; // 200MB total

        if (totalSize > maxTotalSize) {
          toast({
            title: "Validation Error",
            description: `Total file size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds 200MB limit. Please remove some files.`,
            variant: "destructive",
          });
          return false;
        }

        // Check for duplicate files
        const fileNames = uploadedFiles.map(f => f.name.toLowerCase());
        const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
        if (duplicates.length > 0) {
          toast({
            title: "Validation Error",
            description: `Please remove duplicate files: ${duplicates.join(", ")}`,
            variant: "destructive",
          });
          return false;
        }
      }

      // Validate project description
      if (request.description.length < 20) {
        toast({
          title: "Validation Error",
          description:
            "Please provide a more detailed description of your project (at least 20 characters)",
          variant: "destructive",
        });
        return false;
      }

      // Validate deadline
      if (request.deadline && request.deadline.trim() !== "") {
        const deadlineDate = new Date(request.deadline);

        // Check if date is valid
        if (Number.isNaN(deadlineDate.getTime())) {
          toast({
            title: "Validation Error",
            description: "Please enter a valid deadline date",
            variant: "destructive",
          });
          return false;
        }

        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 1); // At least 1 day from now

        if (deadlineDate < minDate) {
          toast({
            title: "Validation Error",
            description: "Deadline must be at least 1 day from today",
            variant: "destructive",
          });
          return false;
        }
      }

      return true;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    const isValid = await validateFormData();
    if (!isValid) {
      return;
    }

    // Call the parent onSubmit callback with the request data
    onSubmit({
      ...request,
      uploadedFiles,
    });

    // Reset form after successful submission
    setRequest({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      genre: "",
      subGenre: "",
      bpm: 120,
      key: "",
      mood: [],
      instruments: [],
      description: "",
      referenceTrack: "",
      deadline: "",
      budget: CUSTOM_BEAT_BASE_PRICE,
      priority: "standard",
      revisions: 2,
      duration: 180,
      additionalNotes: "",
    });
    setUploadedFiles([]);
  };

  const toggleMood = (mood: string) => {
    setRequest(prev => {
      if (prev.mood.includes(mood)) {
        return { ...prev, mood: prev.mood.filter(m => m !== mood) };
      }
      // Limit to 3 moods max
      if (prev.mood.length >= 3) {
        return prev;
      }
      return { ...prev, mood: [...prev.mood, mood] };
    });
  };

  const toggleInstrument = (instrument: string) => {
    setRequest(prev => {
      if (prev.instruments.includes(instrument)) {
        return { ...prev, instruments: prev.instruments.filter(i => i !== instrument) };
      }
      // Limit to 5 instruments max
      if (prev.instruments.length >= 5) {
        return prev;
      }
      return { ...prev, instruments: [...prev.instruments, instrument] };
    });
  };

  // Computed values
  const totalPrice = getPriorityPrice(request.budget, request.priority);
  const deliveryTime = getDeliveryTime(request.priority);
  const priorityFee = getPriorityFee(request.priority);

  // Handler for removing uploaded files
  const handleRemoveFile = (fileToRemove: File) => {
    setUploadedFiles(files => files.filter(f => f !== fileToRemove));
  };

  return (
    <Card className="card-dark max-w-3xl mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl sm:text-2xl text-white">Custom Beat Request</CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          From ${CUSTOM_BEAT_BASE_PRICE} · {deliveryTime}
        </p>
      </CardHeader>

      <CardContent className="pb-24 md:pb-6">
        {/* Form Validation Loading State */}
        {isValidating && (
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <p className="text-blue-300">Validating form data...</p>
            </div>
          </div>
        )}

        {/* File Upload Progress */}
        {fileUploadState.isUploading && (
          <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <div className="flex-1">
                <p className="text-purple-300 font-medium">Uploading {fileUploadState.fileName}</p>
                {fileUploadState.progress !== undefined && (
                  <div className="mt-2 bg-purple-900/30 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${fileUploadState.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form id="custom-beat-request-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <User className="w-4 h-4 text-[var(--accent-purple)]" />
              <span>Contact Info</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName-input" className="form-label">
                  First Name *
                </label>
                <Input
                  id="firstName-input"
                  type="text"
                  value={request.firstName}
                  onChange={e => setRequest(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName-input" className="form-label">
                  Last Name *
                </label>
                <Input
                  id="lastName-input"
                  type="text"
                  value={request.lastName}
                  onChange={e => setRequest(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label htmlFor="email-input" className="form-label">
                  Email *
                </label>
                <Input
                  id="email-input"
                  type="email"
                  value={request.email}
                  onChange={e => setRequest(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@example.com"
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label htmlFor="phone-input" className="form-label">
                  Phone *
                </label>
                <Input
                  id="phone-input"
                  type="tel"
                  value={request.phone}
                  onChange={e => setRequest(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Beat Specifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <Music className="w-4 h-4 text-[var(--accent-purple)]" />
              <span>Beat Specifications</span>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="genre-select" className="form-label">
                  Genre *
                </label>
                <Select
                  value={request.genre}
                  onValueChange={value =>
                    setRequest(prev => ({ ...prev, genre: value, subGenre: "" }))
                  }
                >
                  <SelectTrigger id="genre-select" className="form-input">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map(genre => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {request.genre && subGenres[request.genre as keyof typeof subGenres] && (
                <div>
                  <label htmlFor="subgenre-select" className="form-label">
                    Sub-Genre
                  </label>
                  <Select
                    value={request.subGenre || ""}
                    onValueChange={value => setRequest(prev => ({ ...prev, subGenre: value }))}
                  >
                    <SelectTrigger id="subgenre-select" className="form-input">
                      <SelectValue placeholder="Select sub-genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {subGenres[request.genre as keyof typeof subGenres].map(subGenre => (
                        <SelectItem key={subGenre} value={subGenre}>
                          {subGenre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* BPM and Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bpm-slider" className="form-label">
                  BPM: {request.bpm}
                </label>
                <Slider
                  id="bpm-slider"
                  value={[request.bpm]}
                  onValueChange={value => setRequest(prev => ({ ...prev, bpm: value[0] }))}
                  min={60}
                  max={200}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <label htmlFor="key-select" className="form-label">
                  Key *
                </label>
                <Select
                  value={request.key}
                  onValueChange={value => setRequest(prev => ({ ...prev, key: value }))}
                >
                  <SelectTrigger id="key-select" className="form-input">
                    <SelectValue placeholder="Select key" />
                  </SelectTrigger>
                  <SelectContent>
                    {keys.map(key => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mood Selection */}
            <fieldset>
              <legend className="form-label">
                Mood * <span className="text-gray-500 font-normal">({request.mood.length}/3)</span>
              </legend>
              <div className="flex flex-wrap gap-2 mt-2">
                {moods.map(mood => (
                  <Badge
                    key={mood}
                    variant={request.mood.includes(mood) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      request.mood.includes(mood)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    } ${!request.mood.includes(mood) && request.mood.length >= 3 ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => toggleMood(mood)}
                  >
                    {mood}
                  </Badge>
                ))}
              </div>
            </fieldset>

            {/* Instruments */}
            <fieldset>
              <legend className="form-label">
                Preferred Instruments{" "}
                <span className="text-gray-500 font-normal">({request.instruments.length}/5)</span>
              </legend>
              <div className="flex flex-wrap gap-2 mt-2">
                {instruments.map(instrument => (
                  <Badge
                    key={instrument}
                    variant={request.instruments.includes(instrument) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      request.instruments.includes(instrument)
                        ? "bg-[var(--accent-cyan)] text-white"
                        : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                    } ${!request.instruments.includes(instrument) && request.instruments.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => toggleInstrument(instrument)}
                  >
                    {instrument}
                  </Badge>
                ))}
              </div>
            </fieldset>

            {/* Duration */}
            <div>
              <label htmlFor="duration-slider" className="form-label">
                Duration: {Math.floor(request.duration / 60)}:
                {(request.duration % 60).toString().padStart(2, "0")}
              </label>
              <Slider
                id="duration-slider"
                value={[request.duration]}
                onValueChange={value => setRequest(prev => ({ ...prev, duration: value[0] }))}
                min={60}
                max={300}
                step={15}
                className="mt-2"
              />
            </div>
          </div>

          {/* Project Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <FileText className="w-4 h-4 text-[var(--accent-purple)]" />
              <span>Project Details</span>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description-textarea" className="form-label">
                Tell us about your project *
              </label>
              <Textarea
                id="description-textarea"
                value={request.description}
                onChange={e => setRequest(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the vibe, energy, or specific elements you want in your beat. Include any reference tracks or artists that inspire the sound you're looking for..."
                className="form-input min-h-24"
              />
            </div>

            {/* Reference Track Upload */}
            <div>
              <span className="form-label">Reference Tracks & Files (Optional)</span>
              <div className="space-y-4">
                <FileUpload
                  onUploadStart={fileUploadHandlers.onUploadStart}
                  onUploadProgress={fileUploadHandlers.onUploadProgress}
                  onUploadSuccess={fileUploadHandlers.onUploadSuccess}
                  onUploadError={error =>
                    fileUploadHandlers.onUploadError(error, fileUploadState.fileName)
                  }
                  acceptedFileTypes={[
                    "audio/mpeg",
                    "audio/wav",
                    "audio/mp3",
                    "audio/aiff",
                    "audio/flac",
                    "application/zip",
                    "application/x-zip-compressed",
                    "application/x-rar-compressed",
                    "application/x-7z-compressed",
                  ]}
                  maxFileSize={100 * 1024 * 1024}
                  uploadDelay={0}
                  enableAntivirusScanning={true}
                  enableSecureUpload={false}
                  allowFormSubmissionOnError={true}
                  maxRetries={3}
                  validateFile={validateBeatRequestFile}
                  className="w-full"
                />

                {/* Display uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300 font-medium">Uploaded files:</p>
                    {uploadedFiles.map(file => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="flex items-center justify-between bg-[var(--medium-gray)] p-3 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Music className="w-4 h-4 text-[var(--accent-purple)]" />
                          <span className="text-white text-sm">{file.name}</span>
                          <span className="text-xs text-gray-400">
                            ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file)}
                          className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-400/10"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-gray-500 text-xs">
                  Upload reference tracks, stems, or any files that will help our producers
                  understand your vision. Supported formats: MP3, WAV, ZIP, RAR, 7Z (Max 50MB per
                  file)
                </p>
              </div>
            </div>
          </div>

          {/* Delivery & Priority Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <Calendar className="w-4 h-4 text-[var(--accent-purple)]" />
              <span>Delivery & Priority</span>
            </div>

            {/* Deadline */}
            <div>
              <label htmlFor="deadline-input" className="form-label">
                Deadline (optional)
              </label>
              <div className="relative">
                <button
                  type="button"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  onClick={() => {
                    const input = document.getElementById(
                      "deadline-input"
                    ) as HTMLInputElement | null;
                    input?.showPicker?.();
                  }}
                  aria-label="Open calendar"
                >
                  <Calendar className="w-4 h-4" />
                </button>
                <Input
                  id="deadline-input"
                  type="date"
                  value={request.deadline}
                  onChange={e => setRequest(prev => ({ ...prev, deadline: e.target.value }))}
                  className="form-input pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              {/* Smart deadline recommendation */}
              {(() => {
                if (!request.deadline) return null;
                const d = new Date(request.deadline);
                if (Number.isNaN(d.getTime())) return null;
                const now = new Date();
                const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                let recommended: "priority" | "express" | null = null;
                if (diffDays <= 2) recommended = "express";
                else if (diffDays <= 5) recommended = "priority";
                if (!recommended || recommended === request.priority) return null;
                const recommendedPriority = recommended; // Capture for closure
                return (
                  <div className="mt-3 p-3 rounded-lg border border-[var(--accent-purple)]/30 bg-purple-900/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-200">
                        To meet this deadline, we recommend{" "}
                        <span className="text-[var(--accent-purple)] font-semibold">
                          {recommendedPriority === "express" ? "Express" : "Priority"}
                        </span>{" "}
                        (+${getPriorityFee(recommendedPriority)}).
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-gray-500 text-white hover:bg-white/10"
                        onClick={() =>
                          setRequest(prev => ({ ...prev, priority: recommendedPriority }))
                        }
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Priority Selection */}
            <fieldset>
              <legend className="form-label">Priority Level</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                {(["standard", "priority", "express"] as const).map(priority => (
                  <PriorityCard
                    key={priority}
                    priority={priority}
                    isSelected={request.priority === priority}
                    onSelect={priority => setRequest(prev => ({ ...prev, priority }))}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          {/* Additional Notes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <Settings className="w-4 h-4 text-[var(--accent-purple)]" />
              <span>Additional Options</span>
            </div>

            <div>
              <label htmlFor="additional-notes-textarea" className="form-label">
                Additional Notes (optional)
              </label>
              <Textarea
                id="additional-notes-textarea"
                value={request.additionalNotes || ""}
                onChange={e => setRequest(prev => ({ ...prev, additionalNotes: e.target.value }))}
                placeholder="Any other specific requirements or preferences..."
                className="form-input"
              />
            </div>
          </div>

          {/* Order Summary */}
          <Card className="bg-[var(--medium-gray)] border-[var(--accent-purple)]/20">
            <CardContent className="p-4">
              <h4 className="font-medium text-white mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Base Price:</span>
                  <span className="text-white">${request.budget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Priority Fee:</span>
                  <span className="text-white">+${priorityFee}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--dark-gray)] pt-2">
                  <span className="font-medium text-white">Total:</span>
                  <span className="font-bold text-[var(--accent-purple)]">${totalPrice}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Delivery:</span>
                  <span className="text-[var(--accent-cyan)]">{deliveryTime}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Revisions:</span>
                  <span className="text-white">{request.revisions} included</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full btn-primary text-lg py-4"
            disabled={isSubmitting || isValidating || fileUploadState.isUploading}
          >
            {isSubmitting || isValidating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {isValidating ? "Validating..." : "Submitting..."}
              </>
            ) : (
              <>
                <Music className="w-5 h-5 mr-2" />
                Submit Custom Beat Request - ${totalPrice}
              </>
            )}
          </Button>

          {/* Form Status Indicators */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              {isValidating ? (
                <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
              ) : (
                <CheckCircle className="w-3 h-3 text-green-400" />
              )}
              <span>Form Validation</span>
            </div>

            <div className="flex items-center gap-1">
              {fileUploadState.isUploading && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              )}
              {!fileUploadState.isUploading && uploadedFiles.length > 0 && (
                <CheckCircle className="w-3 h-3 text-green-400" />
              )}
              {!fileUploadState.isUploading && uploadedFiles.length === 0 && (
                <div className="w-3 h-3 rounded-full border border-gray-500" />
              )}
              <span>File Uploads ({uploadedFiles.length})</span>
            </div>

            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Ready to Submit</span>
            </div>
          </div>
        </form>
      </CardContent>

      {/* Sticky CTA Mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[var(--deep-black)]/95 border-t border-[var(--medium-gray)] p-3 z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-gray-400">Total</div>
            <div className="text-lg font-semibold text-white">
              ${totalPrice} <span className="text-xs text-gray-400">• {deliveryTime}</span>
            </div>
          </div>
          <Button
            form="custom-beat-request-form"
            type="submit"
            className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/90 text-white"
            disabled={isSubmitting || isValidating || fileUploadState.isUploading}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Submit — ${totalPrice}</>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

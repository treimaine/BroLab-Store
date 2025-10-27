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
import { useEnhancedFormSubmission } from "@/hooks/useEnhancedFormSubmission";
import { AlertTriangle, CheckCircle, Clock, Loader2, Music, Send, Star } from "lucide-react";
import { useState } from "react";
import {
  FileUploadProgress,
  FormValidationLoading,
  RetryIndicator,
  SubmissionProgress,
} from "./ReservationLoadingStates";

export interface CustomBeatRequestProps {
  readonly onSubmit: (request: BeatRequest) => void;
  readonly isSubmitting?: boolean;
}

interface BeatRequest {
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
  const [request, setRequest] = useState<BeatRequest>({
    genre: "",
    bpm: 120,
    key: "",
    mood: [],
    instruments: [],
    duration: 180,
    description: "",
    budget: 150,
    deadline: "",
    revisions: 2,
    priority: "standard",
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileUploadState, setFileUploadState] = useState<{
    isUploading: boolean;
    fileName?: string;
    progress?: number;
    status?: "uploading" | "scanning" | "completed" | "error";
  }>({ isUploading: false });

  // Enhanced form submission with multi-step process
  const {
    isSubmitting: isFormSubmitting,
    isValidating,
    currentStep,
    totalSteps,
    progress,
    hasError,
    retryCount,
    isRecovering,
    submitForm,
    validateForm,
    retry,
    clearError,
    getErrorDisplay,
    createReservationSteps,
  } = useEnhancedFormSubmission({
    serviceName: "custom beat request",
    maxRetries: 3,
    showProgressToast: true,
    autoRetryTransientErrors: false,
    onStepComplete: (stepIndex: number, result: unknown) => {
      // Log step completion for debugging
      console.log(`Step ${stepIndex + 1} completed:`, result);
    },
    onSubmissionComplete: (result: unknown) => {
      // Call the parent onSubmit callback with the result
      onSubmit(result as BeatRequest);
    },
    onSubmissionError: (error: unknown) => {
      console.error("Submission error:", error);
    },
  });

  // Use isFormSubmitting from the hook, but allow override from props
  const submitting = isSubmitting || isFormSubmitting;

  const validateFormData = async (): Promise<boolean> => {
    return validateForm(async () => {
      // Validate required fields
      if (!request.genre || !request.key || request.mood.length === 0) {
        throw new Error("Please fill in all required fields (Genre, Key, and at least one Mood)");
      }

      // Validate file uploads if any
      if (uploadedFiles.length > 0) {
        const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
        const maxTotalSize = 200 * 1024 * 1024; // 200MB total

        if (totalSize > maxTotalSize) {
          throw new Error(
            `Total file size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds 200MB limit. Please remove some files.`
          );
        }

        // Check for duplicate files
        const fileNames = uploadedFiles.map(f => f.name.toLowerCase());
        const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
        if (duplicates.length > 0) {
          throw new Error(`Please remove duplicate files: ${duplicates.join(", ")}`);
        }
      }

      // Validate project description
      if (request.description.length < 20) {
        throw new Error(
          "Please provide a more detailed description of your project (at least 20 characters)"
        );
      }

      // Validate deadline
      if (request.deadline) {
        const deadlineDate = new Date(request.deadline);
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 1); // At least 1 day from now

        if (deadlineDate < minDate) {
          throw new Error("Deadline must be at least 1 day from today");
        }
      }

      return true;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    const isValid = await validateFormData();
    if (!isValid) {
      return;
    }

    try {
      // Create submission steps
      const steps = createReservationSteps(
        {
          ...request,
          uploadedFiles: uploadedFiles.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type,
          })),
        },
        {
          createPaymentIntent: true,
          uploadFiles: uploadedFiles,
          customSteps: [
            {
              name: "finalize_request",
              description: "Finalizing custom beat request",
              action: async () => {
                // This would be the final step to confirm the request
                return { ...request, uploadedFiles };
              },
              retryable: false,
              timeout: 10000,
            },
          ],
        }
      );

      // Submit the form with all steps
      await submitForm(steps);
    } catch (err) {
      // Error is already handled by useEnhancedFormSubmission
      console.error("Form submission failed:", err);
    }
  };

  const toggleMood = (mood: string) => {
    setRequest(prev => ({
      ...prev,
      mood: prev.mood.includes(mood) ? prev.mood.filter(m => m !== mood) : [...prev.mood, mood],
    }));
  };

  const toggleInstrument = (instrument: string) => {
    setRequest(prev => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter(i => i !== instrument)
        : [...prev.instruments, instrument],
    }));
  };

  const getPriorityPrice = () => {
    const basePrices = { standard: 0, priority: 50, express: 100 };
    return request.budget + basePrices[request.priority];
  };

  const getDeliveryTime = () => {
    const times = { standard: "5-7 days", priority: "3-5 days", express: "1-2 days" };
    return times[request.priority];
  };

  const getPriorityFee = () => {
    const fees = { standard: 0, priority: 50, express: 100 };
    return fees[request.priority];
  };

  return (
    <Card className="card-dark max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Music className="w-5 h-5" />
          Custom Beat Request
        </CardTitle>
        <p className="text-gray-400">
          Tell us exactly what you&apos;re looking for and we&apos;ll create a custom beat just for
          you
        </p>
      </CardHeader>

      <CardContent>
        {/* Form Validation Loading State */}
        <FormValidationLoading isVisible={isValidating} />

        {/* Submission Progress */}
        <SubmissionProgress
          isVisible={submitting && !hasError}
          currentStep={currentStep}
          totalSteps={totalSteps}
          progress={progress}
          stepName={
            currentStep > 0 && currentStep <= totalSteps
              ? [
                  "Validating authentication",
                  "Creating reservation",
                  "Uploading files",
                  "Setting up payment",
                  "Finalizing request",
                ][currentStep - 1]
              : undefined
          }
        />

        {/* Error Display */}
        {hasError && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-300 mb-2">Submission Error</h4>
                <p className="text-red-200 text-sm mb-3">
                  {getErrorDisplay()?.message || "An error occurred while processing your request"}
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearError}
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    Dismiss
                  </Button>
                  {getErrorDisplay()?.canRetry && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={retry}
                      className="bg-red-500/20 text-red-300 hover:bg-red-500/30"
                      disabled={isRecovering}
                    >
                      {isRecovering ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        `Try Again (${3 - retryCount} left)`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Retry Indicator */}
        <RetryIndicator
          isVisible={retryCount > 0 && !hasError}
          attempt={retryCount}
          maxAttempts={3}
        />

        {/* File Upload Progress */}
        <FileUploadProgress
          isVisible={fileUploadState.isUploading}
          fileName={fileUploadState.fileName}
          progress={fileUploadState.progress}
          status={fileUploadState.status}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <legend className="form-label">Mood *</legend>
            <div className="flex flex-wrap gap-2 mt-2">
              {moods.map(mood => (
                <Badge
                  key={mood}
                  variant={request.mood.includes(mood) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    request.mood.includes(mood)
                      ? "bg-[var(--accent-purple)] text-white"
                      : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                  }`}
                  onClick={() => toggleMood(mood)}
                >
                  {mood}
                </Badge>
              ))}
            </div>
          </fieldset>

          {/* Instruments */}
          <fieldset>
            <legend className="form-label">Preferred Instruments</legend>
            <div className="flex flex-wrap gap-2 mt-2">
              {instruments.map(instrument => (
                <Badge
                  key={instrument}
                  variant={request.instruments.includes(instrument) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    request.instruments.includes(instrument)
                      ? "bg-[var(--accent-cyan)] text-white"
                      : "border-[var(--medium-gray)] text-gray-300 hover:bg-[var(--medium-gray)]"
                  }`}
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

          {/* Description */}
          <div>
            <label htmlFor="description-textarea" className="form-label">
              Description & Reference
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
                onUploadStart={(file: File) => {
                  setFileUploadState({
                    isUploading: true,
                    fileName: file.name,
                    progress: 0,
                    status: "uploading",
                  });
                }}
                onUploadProgress={(progress: number) => {
                  setFileUploadState(prev => ({
                    ...prev,
                    progress,
                    status: progress < 100 ? "uploading" : "scanning",
                  }));
                }}
                onUploadSuccess={(file: File) => {
                  setFileUploadState({
                    isUploading: false,
                    fileName: file.name,
                    progress: 100,
                    status: "completed",
                  });

                  setUploadedFiles(prev => [...prev, file]);

                  toast({
                    title: "File Uploaded Successfully",
                    description: `${file.name} has been uploaded and scanned for security.`,
                    variant: "default",
                  });

                  // Clear upload state after a delay
                  setTimeout(() => {
                    setFileUploadState({ isUploading: false });
                  }, 3000);
                }}
                onUploadError={(error: {
                  message: string;
                  code: string;
                  recoverable?: boolean;
                  severity?: "warning" | "error";
                }) => {
                  console.error("File upload error:", error);

                  setFileUploadState({
                    isUploading: false,
                    fileName: fileUploadState.fileName,
                    status: "error",
                  });

                  // Show error toast
                  toast({
                    title: "File Upload Failed",
                    description: error.message,
                    variant: "destructive",
                  });

                  // Clear upload state after a delay
                  setTimeout(() => {
                    setFileUploadState({ isUploading: false });
                  }, 5000);
                }}
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
                maxFileSize={100 * 1024 * 1024} // 100MB as shown in UI
                uploadDelay={0} // No upload simulation
                enableAntivirusScanning={true}
                enableSecureUpload={false} // Keep as simulation for now
                allowFormSubmissionOnError={true}
                maxRetries={3}
                validateFile={(file: File) => {
                  // Additional custom validation for beat requests
                  const fileName = file.name.toLowerCase();

                  // Check for common audio formats
                  const audioExtensions = [".mp3", ".wav", ".aiff", ".flac", ".m4a"];
                  const archiveExtensions = [".zip", ".rar", ".7z"];
                  const isAudio = audioExtensions.some(ext => fileName.endsWith(ext));
                  const isArchive = archiveExtensions.some(ext => fileName.endsWith(ext));

                  if (!isAudio && !isArchive) {
                    return {
                      message:
                        "Please upload audio files or compressed archives containing audio files",
                      code: "INVALID_CONTENT_TYPE",
                      recoverable: false,
                      severity: "error" as const,
                    };
                  }

                  // Check for reasonable file sizes for audio
                  if (isAudio && file.size > 50 * 1024 * 1024) {
                    // 50MB for single audio files
                    return {
                      message:
                        "Individual audio files should be under 50MB. Use compressed archives for larger files.",
                      code: "AUDIO_FILE_TOO_LARGE",
                      recoverable: false,
                      severity: "warning" as const,
                    };
                  }

                  return null;
                }}
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
                        onClick={() => setUploadedFiles(files => files.filter(f => f !== file))}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-400/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-gray-500 text-xs">
                Upload reference tracks, stems, or any files that will help our producers understand
                your vision. Supported formats: MP3, WAV, ZIP, RAR, 7Z (Max 50MB per file)
              </p>
            </div>
          </div>

          {/* Budget and Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget-slider" className="form-label">
                Budget: ${request.budget}
              </label>
              <Slider
                id="budget-slider"
                value={[request.budget]}
                onValueChange={value => setRequest(prev => ({ ...prev, budget: value[0] }))}
                min={50}
                max={500}
                step={25}
                className="mt-2"
              />
            </div>

            <div>
              <label htmlFor="deadline-input" className="form-label">
                Deadline
              </label>
              <Input
                id="deadline-input"
                type="date"
                value={request.deadline}
                onChange={e => setRequest(prev => ({ ...prev, deadline: e.target.value }))}
                className="form-input"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Priority Selection */}
          <fieldset>
            <legend className="form-label">Priority Level</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {(["standard", "priority", "express"] as const).map(priority => {
                const getPriorityIcon = () => {
                  if (priority === "express") return <Star className="w-5 h-5 text-yellow-400" />;
                  if (priority === "priority")
                    return <Clock className="w-5 h-5 text-[var(--accent-cyan)]" />;
                  return <Music className="w-5 h-5 text-gray-400" />;
                };

                const getPriorityFeeAmount = () => {
                  if (priority === "standard") return 0;
                  if (priority === "priority") return 50;
                  return 100;
                };

                return (
                  <Card
                    key={priority}
                    className={`cursor-pointer transition-all ${
                      request.priority === priority
                        ? "border-[var(--accent-purple)] bg-[var(--accent-purple)]/10"
                        : "border-[var(--medium-gray)] hover:border-[var(--accent-purple)]/50"
                    }`}
                    onClick={() => setRequest(prev => ({ ...prev, priority }))}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        {getPriorityIcon()}
                      </div>
                      <h4 className="font-medium text-white capitalize">{priority}</h4>
                      <p className="text-xs text-gray-400 mt-1">{getDeliveryTime()}</p>
                      <p className="text-sm font-bold text-[var(--accent-purple)] mt-2">
                        +${getPriorityFeeAmount()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </fieldset>

          {/* Additional Notes */}
          <div>
            <label htmlFor="additional-notes-textarea" className="form-label">
              Additional Notes
            </label>
            <Textarea
              id="additional-notes-textarea"
              value={request.additionalNotes || ""}
              onChange={e => setRequest(prev => ({ ...prev, additionalNotes: e.target.value }))}
              placeholder="Any other specific requirements or preferences..."
              className="form-input"
            />
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
                  <span className="text-white">+${getPriorityFee()}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--dark-gray)] pt-2">
                  <span className="font-medium text-white">Total:</span>
                  <span className="font-bold text-[var(--accent-purple)]">
                    ${getPriorityPrice()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Delivery:</span>
                  <span className="text-[var(--accent-cyan)]">{getDeliveryTime()}</span>
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
            disabled={submitting || isValidating || fileUploadState.isUploading || hasError}
          >
            {(() => {
              if (submitting) {
                return (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {currentStep > 0 && totalSteps > 0
                      ? `Processing (${currentStep}/${totalSteps})...`
                      : "Submitting Request..."}
                  </div>
                );
              }
              if (isValidating) {
                return (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating...
                  </div>
                );
              }
              if (fileUploadState.isUploading) {
                return (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading Files...
                  </div>
                );
              }
              if (hasError) {
                return (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Please Fix Errors Above
                  </div>
                );
              }
              return (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Custom Beat Request - ${getPriorityPrice()}
                </>
              );
            })()}
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
              {hasError ? (
                <AlertTriangle className="w-3 h-3 text-red-400" />
              ) : (
                <CheckCircle className="w-3 h-3 text-green-400" />
              )}
              <span>Ready to Submit</span>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface FormProgressBarProps {
  readonly formData: {
    name: string;
    email: string;
    preferredDate: string;
    timeSlot: string;
    projectDetails: string;
  };
  readonly isAuthLoading: boolean;
  readonly isSubmitting: boolean;
}

export function FormProgressBar({
  formData,
  isAuthLoading,
  isSubmitting,
}: FormProgressBarProps): JSX.Element | null {
  if (isAuthLoading || isSubmitting) {
    return null;
  }

  const calculateProgress = (): number => {
    const fields = [
      formData.name,
      formData.email,
      formData.preferredDate,
      formData.timeSlot,
      formData.projectDetails,
    ];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="mt-4 p-3 bg-gray-900/30 rounded-lg">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span>Form Completion</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-[var(--accent-purple)] to-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

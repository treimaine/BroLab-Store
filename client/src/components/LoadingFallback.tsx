interface LoadingFallbackProps {
  message?: string;
}

export function LoadingFallback({ message = "Loading..." }: LoadingFallbackProps) {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[var(--deep-black)]">
      <div className="text-center">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
          aria-label="Loading"
        />
        <p className="text-white">{message}</p>
      </div>
    </div>
  );
}

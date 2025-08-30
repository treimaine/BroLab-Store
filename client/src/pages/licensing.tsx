import { StandardHero } from "@/components/ui/StandardHero";
import { useWordPress } from "@/hooks/use-wordpress";

export default function Licensing() {
  const { page, isLoading, error } = useWordPress("licensing");

  if (isLoading) {
    return (
      <div className="pt-16 min-h-screen bg-[var(--deep-black)] text-white">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="animate-pulse">
            <div className="h-12 bg-[var(--medium-gray)] rounded mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-[var(--medium-gray)] rounded w-3/4"></div>
              <div className="h-4 bg-[var(--medium-gray)] rounded w-1/2"></div>
              <div className="h-4 bg-[var(--medium-gray)] rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-16 min-h-screen bg-[var(--deep-black)] text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-6 text-red-400">Error Loading Page</h1>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  const fallbackContent = (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      <StandardHero
        title="Licensing Guide"
        subtitle="Understand our beat licensing options and choose the right license for your music projects."
      />

      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--accent-purple)]">
              Basic MP3 License - $29.99
            </h2>
            <ul className="text-gray-300 space-y-3 ml-6">
              <li>• Up to 50,000 audio streams</li>
              <li>• Distribute up to 2,500 copies</li>
              <li>• MP3 included</li>
              <li>• Producer credit required</li>
              <li>• Perfect for uploading to YouTube, Spotify, or streaming platforms</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--accent-purple)]">
              Premium WAV License - $49.99
            </h2>
            <ul className="text-gray-300 space-y-3 ml-6">
              <li>• Up to 150,000 audio streams</li>
              <li>• Distribute up to 2,500 copies</li>
              <li>• MP3 + WAV included</li>
              <li>• Producer credit required</li>
              <li>• Most popular choice for highest quality audio</li>
              <li>• Professional license for commercial music release</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--accent-purple)]">
              Unlimited License - $149.99
            </h2>
            <ul className="text-gray-300 space-y-3 ml-6">
              <li>• Unlimited audio streams</li>
              <li>• Unlimited copies distribution</li>
              <li>• MP3 + WAV + stems included</li>
              <li>• Paid performances allowed</li>
              <li>• Radio broadcasting rights (2 stations)</li>
              <li>• Better than Premium License!</li>
              <li>• Complete commercial freedom with stems</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Important Notes</h2>
            <ul className="text-gray-300 space-y-3 ml-6">
              <li>• All licenses are delivered instantly via email</li>
              <li>• Contracts and legal documents included</li>
              <li>• Free updates and re-downloads for life</li>
              <li>• Custom licensing available upon request</li>
              <li>• Contact us for bulk pricing and special projects</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--deep-black)] text-white">
      {page ? (
        <>
          <StandardHero
            title={(page.title?.rendered || "Licensing").replace(/<[^>]+>/g, "")}
            subtitle="Understand our beat licensing options and choose the right license for your music projects."
          />
          <div className="max-w-4xl mx-auto px-4 py-20">
            <div
              className="prose prose-invert prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: page.content.rendered }}
            />
          </div>
        </>
      ) : (
        fallbackContent
      )}
    </div>
  );
}

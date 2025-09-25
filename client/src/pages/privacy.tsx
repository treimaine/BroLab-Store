import { StandardHero } from "@/components/ui/StandardHero";
import { useWordPress } from "@/hooks/use-wordpress";

export default function Privacy() {
  const { page, isLoading, error } = useWordPress("privacy-policy");

  if (isLoading) {
    return (
      <div className="pt-16 min-h-screen bg-[var(--deep-black)] text-white">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="animate-pulse">
            <div className="h-12 bg-[var(--medium-gray)] rounded mb-8" />
            <div className="space-y-4">
              <div className="h-4 bg-[var(--medium-gray)] rounded w-3/4" />
              <div className="h-4 bg-[var(--medium-gray)] rounded w-1/2" />
              <div className="h-4 bg-[var(--medium-gray)] rounded w-5/6" />
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
        title="Privacy Policy"
        subtitle="Learn how we collect, use, and protect your personal information at BroLab Entertainment."
      />

      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Information We Collect</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We collect information you provide directly to us, such as when you:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>• Create an account or make a purchase</li>
              <li>• Contact us for support or inquiries</li>
              <li>• Subscribe to our newsletter</li>
              <li>• Interact with our website and services</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>• Process transactions and deliver digital products</li>
              <li>• Provide customer support and respond to inquiries</li>
              <li>• Send important updates about your purchases</li>
              <li>• Improve our website and services</li>
              <li>• Send promotional emails (with your consent)</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Information Sharing</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We do not sell, trade, or otherwise transfer your personal information to third
              parties except as described in this policy. We may share your information with trusted
              service providers who assist us in operating our website and conducting our business.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We implement appropriate security measures to protect your personal information.
              However, no method of transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Cookies and Tracking</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We use cookies and similar technologies to enhance your browsing experience, analyze
              website traffic, and understand where our visitors are coming from. You can control
              cookie settings through your browser.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have questions about this privacy policy, please contact us at
              contact@brolabentertainment.com.
            </p>
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
            title={(page.title?.rendered || "Privacy Policy").replace(/<[^>]+>/g, "")}
            subtitle="Learn how we collect, use, and protect your personal information at BroLab Entertainment."
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

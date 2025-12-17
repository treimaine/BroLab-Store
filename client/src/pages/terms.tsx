import { StandardHero } from "@/components/ui/StandardHero";
import { useWordPress } from "@/hooks/use-wordpress";
import { sanitizeHtml } from "@shared/utils/sanitize";

export default function Terms() {
  const { page, isLoading, error } = useWordPress("terms-of-service");

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
        title="Terms of Service"
        subtitle="Please review our terms and conditions for using BroLab Entertainment services."
      />

      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              By accessing and using BroLab Entertainment&apos;s website and services, you accept
              and agree to be bound by the terms and provision of this agreement. If you do not
              agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">2. License and Usage Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Upon purchase of a beat license, you are granted specific rights based on the license
              type:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>
                • <strong>Basic License:</strong> Non-exclusive rights for up to 2,500 streams/sales
              </li>
              <li>
                • <strong>Premium License:</strong> Non-exclusive rights for up to 10,000
                streams/sales
              </li>
              <li>
                • <strong>Unlimited License:</strong> Non-exclusive rights for unlimited
                streams/sales
              </li>
              <li>
                • <strong>Exclusive License:</strong> Full exclusive ownership rights
              </li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">3. Prohibited Uses</h2>
            <p className="text-gray-300 leading-relaxed mb-4">You may not use our beats for:</p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>• Reselling or redistributing the beat files</li>
              <li>• Creating derivative works without permission</li>
              <li>• Illegal or harmful content</li>
              <li>• Content that infringes on third-party rights</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">4. Payment and Refunds</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              All purchases are final. Digital products are delivered immediately upon payment
              confirmation. Refunds may be considered only in cases of technical issues preventing
              download or use.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">5. Intellectual Property</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              BroLab Entertainment retains all rights to the original compositions. Licensed beats
              remain the intellectual property of BroLab Entertainment unless an exclusive license
              is purchased.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">6. Contact Information</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions about these terms, please contact us at contact@brolabentertainment.com
              or through our contact page.
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
            title={(page.title?.rendered || "Terms of Service").replaceAll(/<[^>]+>/g, "")}
            subtitle="Please review our terms and conditions for using BroLab Entertainment services."
          />
          <div className="max-w-4xl mx-auto px-4 py-20">
            <div
              className="prose prose-invert prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content.rendered) }}
            />
          </div>
        </>
      ) : (
        fallbackContent
      )}
    </div>
  );
}

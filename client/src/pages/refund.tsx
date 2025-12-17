import { StandardHero } from "@/components/ui/StandardHero";
import { useWordPress } from "@/hooks/use-wordpress";
<<<<<<< HEAD
=======
import { sanitizeHtml } from "@shared/utils/sanitize";
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc

export default function Refund() {
  const { page, isLoading, error } = useWordPress("refund-policy");

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
        title="Refund Policy"
        subtitle="Learn about our refund policy for digital products and the circumstances under which refunds may be considered."
      />

      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Digital Product Policy</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Due to the digital nature of our products, all sales are final. Once a beat is
              purchased and downloaded, we cannot offer refunds as the product has been delivered in
              full.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Exceptions</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may consider refunds in the following circumstances:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>• Technical issues preventing download or access to files</li>
              <li>• Duplicate charges due to payment processing errors</li>
              <li>• Fraudulent charges made without authorization</li>
              <li>• Corrupted or incomplete file delivery</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Request Process</h2>
            <p className="text-gray-300 leading-relaxed mb-4">To request a refund consideration:</p>
            <ol className="text-gray-300 space-y-2 ml-6">
              <li>1. Contact us within 48 hours of purchase</li>
              <li>2. Provide your order number and email address</li>
              <li>3. Explain the specific issue encountered</li>
              <li>4. Include any relevant screenshots or error messages</li>
            </ol>
            <p className="text-gray-300 leading-relaxed mt-6">
              We will review each case individually and respond within 2-3 business days.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Chargeback Policy</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Initiating a chargeback without first contacting us may result in permanent suspension
              from our services. We encourage customers to reach out directly for any issues.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              For refund requests or questions about our policy:
            </p>
            <ul className="text-gray-300 space-y-2">
              <li>Email: contact@brolabentertainment.com</li>
              <li>Phone: (+33) 7 50 47 13 17</li>
              <li>Response time: 2-3 business days</li>
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
<<<<<<< HEAD
            title={(page.title?.rendered || "Refund Policy").replace(/<[^>]+>/g, "")}
=======
            title={(page.title?.rendered || "Refund Policy").replaceAll(/<[^>]+>/g, "")}
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
            subtitle="Learn about our refund policy for digital products and the circumstances under which refunds may be considered."
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

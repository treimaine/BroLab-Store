import { StandardHero } from "@/components/ui/StandardHero";
import { useWordPress } from "@/hooks/use-wordpress";
<<<<<<< HEAD
=======
import { sanitizeHtml } from "@shared/utils/sanitize";
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc

export default function Copyright() {
  const { page, isLoading, error } = useWordPress("copyright");

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
        title="Copyright Information"
        subtitle="Important copyright information about our music compositions and licensing rights."
      />

      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Copyright Notice</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              All music compositions, beats, and instrumentals available on BroLab Entertainment are
              original works created by our production team. These works are protected under
              international copyright law.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Ownership Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Unless otherwise specified through an exclusive license purchase:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>• BroLab Entertainment retains full copyright ownership</li>
              <li>• Licensed users receive usage rights, not ownership</li>
              <li>• Original compositions remain intellectual property of BroLab Entertainment</li>
              <li>• Unauthorized use or distribution is strictly prohibited</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Copyright Infringement</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you believe your copyright has been infringed, please provide us with:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>• Detailed description of the copyrighted work</li>
              <li>• Identification of the infringing material</li>
              <li>• Your contact information</li>
              <li>• A statement of good faith belief</li>
              <li>• Electronic signature or physical signature</li>
            </ul>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">DMCA Compliance</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              BroLab Entertainment complies with the Digital Millennium Copyright Act (DMCA). We
              respond promptly to valid takedown notices and will remove infringing content when
              properly notified.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Fair Use</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Small portions of our beats may be used for educational purposes, criticism, or
              commentary under fair use doctrine. However, commercial use requires proper licensing
              through our platform.
            </p>
          </div>

          <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Contact for Copyright Issues</h2>
            <div className="text-gray-300 space-y-2">
              <p>
                <strong>Copyright Agent:</strong> BroLab Entertainment
              </p>
              <p>
                <strong>Email:</strong> contact@brolabentertainment.com
              </p>
              <p>
                <strong>Address:</strong> LILLE, FR
              </p>
              <p>
                <strong>Phone:</strong> (+33) 7 50 47 13 17
              </p>
            </div>
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
            title={(page.title?.rendered || "Copyright").replace(/<[^>]+>/g, "")}
=======
            title={(page.title?.rendered || "Copyright").replaceAll(/<[^>]+>/g, "")}
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
            subtitle="Important copyright information about our music compositions and licensing rights."
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

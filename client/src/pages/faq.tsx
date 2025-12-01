import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useWordPress } from "@/hooks/use-wordpress";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function FAQ() {
  useScrollToTop();
  const [openItems, setOpenItems] = useState<number[]>([]);
  const { page } = useWordPress("faq");

  const toggleItem = (index: number) => {
    setOpenItems(prev => (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]));
  };

  const defaultFAQs = [
    {
      question: "What types of licenses do you offer?",
      answer:
        "We offer several licensing options: Basic MP3 License for demos and non-commercial use, Premium WAV License for commercial releases, Unlimited License for unlimited streams/sales, and Exclusive License for complete ownership of the beat.",
    },
    {
      question: "Can I use the beats for commercial purposes?",
      answer:
        "Yes! With our Premium, Unlimited, and Exclusive licenses, you can use the beats for commercial releases. The Basic license is for non-commercial use only.",
    },
    {
      question: "Do I get the stems/trackouts?",
      answer:
        "Stems and trackouts are included with Unlimited and Exclusive licenses. Basic and Premium licenses include the mixed stereo file only.",
    },
    {
      question: "How do I download my beats after purchase?",
      answer:
        "After completing your purchase, you'll receive an email with download links. You can also access your purchases through your account dashboard if you created an account.",
    },
    {
      question: "Can I get a custom beat made?",
      answer:
        "Absolutely! We offer custom beat production services. Contact us with your requirements, and we'll create a unique beat tailored to your style and needs.",
    },
    {
      question: "What if I need help with mixing or mastering?",
      answer:
        "We offer professional mixing and mastering services for an additional fee. This ensures your final track meets industry standards and sounds great on all platforms.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "Due to the digital nature of our products, we generally don't offer refunds once a beat has been downloaded. However, if there are technical issues with your download, please contact us immediately.",
    },
    {
      question: "Can I modify the beats I purchase?",
      answer:
        "Yes, you're free to modify, arrange, and customize the beats according to your creative vision, as long as it's within the terms of your license agreement.",
    },
  ];

  const faqs = page?.content?.rendered ? [] : defaultFAQs; // Use WordPress content if available

  return (
    <div className="pt-16 min-h-screen bg-[var(--deep-black)] text-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-300">
            Find answers to common questions about our beats and licensing
          </p>
        </div>

        {page?.content?.rendered ? (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content.rendered }}
          />
        ) : (
          <div className="space-y-4">
            {faqs.map(faq => (
              <div
                key={faq.question}
                className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(faqs.indexOf(faq))}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-[var(--medium-gray)] transition-colors"
                >
                  <h3 className="text-lg font-semibold pr-4">{faq.question}</h3>
                  {openItems.includes(faqs.indexOf(faq)) ? (
                    <ChevronUp className="w-5 h-5 text-[var(--accent-purple)] flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--accent-purple)] flex-shrink-0" />
                  )}
                </button>
                {openItems.includes(faqs.indexOf(faq)) && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-gray-300 mb-6">
            Can&apos;t find what you&apos;re looking for? Get in touch with our team.
          </p>
          <a
            href="/contact"
            className="inline-block bg-[var(--accent-purple)] hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}

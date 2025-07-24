import { useWordPress } from '@/hooks/use-wordpress';
import { Helmet } from 'react-helmet-async';

interface PageRendererProps {
  slug: string;
  fallbackTitle?: string;
  fallbackContent?: React.ReactNode;
}

export function PageRenderer({ slug, fallbackTitle, fallbackContent }: PageRendererProps) {
  const { page, isLoading, error } = useWordPress(slug);

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

  if (error && !fallbackContent) {
    return (
      <div className="pt-16 min-h-screen bg-[var(--deep-black)] text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-6 text-red-400">Error Loading Page</h1>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  const title = page?.title?.rendered || fallbackTitle || 'BroLab Entertainment';
  const content = page?.content?.rendered;

  return (
    <div className="pt-16 min-h-screen bg-[var(--deep-black)] text-white">
      <Helmet>
        <title>{title} | BroLab Entertainment</title>
        {page?.excerpt?.rendered && (
          <meta name="description" content={page.excerpt.rendered.replace(/<[^>]*>/g, '')} />
        )}
      </Helmet>
      
      <div className="max-w-4xl mx-auto px-4 py-20">
        {page && content ? (
          <>
            <h1 
              className="text-4xl md:text-5xl font-bold mb-12 text-center"
              dangerouslySetInnerHTML={{ __html: title }}
            />
            <div 
              className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-[var(--accent-purple)] prose-strong:text-white prose-ul:text-gray-300 prose-ol:text-gray-300"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </>
        ) : (
          fallbackContent
        )}
      </div>
    </div>
  );
}

export default PageRenderer;
'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>;
            }
            return (
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2">
                <code className="text-sm">{children}</code>
              </pre>
            );
          },
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

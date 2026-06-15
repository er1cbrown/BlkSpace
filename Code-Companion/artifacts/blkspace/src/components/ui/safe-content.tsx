import { useMemo } from "react";

interface SafeContentProps {
  text: string;
  className?: string;
}

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

export function SafeContent({ text, className = "" }: SafeContentProps) {
  const parts = useMemo(() => {
    const result: Array<{ type: "text" | "url"; value: string }> = [];
    let last = 0;
    let match: RegExpExecArray | null;
    const re = new RegExp(URL_REGEX.source, "g");
    while ((match = re.exec(text)) !== null) {
      if (match.index > last) {
        result.push({ type: "text", value: text.slice(last, match.index) });
      }
      result.push({ type: "url", value: match[0] });
      last = re.lastIndex;
    }
    if (last < text.length) {
      result.push({ type: "text", value: text.slice(last) });
    }
    return result;
  }, [text]);

  return (
    <p className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, i) =>
        part.type === "url" ? (
          <a
            key={i}
            href={part.value}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary underline underline-offset-2 hover:brightness-110"
            onClick={(e) => e.stopPropagation()}
          >
            {part.value}
          </a>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </p>
  );
}

import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  enabled: boolean;
  color: string;
}

export function TypewriterText({ text, enabled, color }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState(enabled ? '' : text);
  const [isTyping, setIsTyping] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    let typeInterval: any = null;

    const runAnimation = () => {
      if (typeInterval) clearInterval(typeInterval);
      setDisplayedText('');
      setIsTyping(true);
      
      let i = 0;
      typeInterval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 45); // highly responsive fast typing
    };

    // Run initially
    runAnimation();

    // Repeat every 10 seconds
    const repeatInterval = setInterval(() => {
      runAnimation();
    }, 10000);

    return () => {
      if (typeInterval) clearInterval(typeInterval);
      clearInterval(repeatInterval);
    };
  }, [text, enabled]);

  return (
    <span className="slide-label font-medium tracking-tight text-[var(--text)] text-sm h-[20px] select-text">
      {displayedText}
      {isTyping && (
        <span className="tw-cursor" style={{ backgroundColor: color }} />
      )}
    </span>
  );
}

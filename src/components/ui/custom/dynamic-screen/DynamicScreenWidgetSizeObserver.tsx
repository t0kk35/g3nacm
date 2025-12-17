/**
 * This is a little helper that will pass the size of the container to children widgets.
 * 
 * A challenge the widgets have is that they don't know how big the parent container is and can overflow it. 
 * They can't measure it from within. It needs to be fed by the parent. 
 * 
 */
import { ReactElement, useEffect, useRef, useState } from "react";

type WidgetContainerProps = {
  children: (size: { width: number; height: number }) => ReactElement;
};

export function DynamicScreenWidgetSizeObserver({ children }: WidgetContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number, height: number } | null>(null);

  useEffect(() => {
    console.log('In Observer ref.current is' + ref.current)
    if (!ref.current) return;

    const observed = ref.current;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize(prev =>
          !prev || prev.width !== width || prev.height !== height
            ? { width, height }
            : prev
        );
      }
    });

    observer.observe(observed);
    return () => observer.unobserve(observed);
  }, []);

  return (
    <div ref={ref} className="w-full h-full">
      {/* Render children *only after* size is valid */}
      {size ? children(size) : null}
    </div>
  );
}

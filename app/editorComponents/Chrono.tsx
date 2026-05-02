import { RefObject, useEffect, useState } from "react";

export function Chrono({ tickRef }: { tickRef: RefObject<number> }) {
  const [lastUpdate, setLastUpdate] = useState(0);
  useEffect(() => {
    const cb = () => {
      setLastUpdate(tickRef.current);
      requestAnimationFrame(cb);
    };
    const handle = requestAnimationFrame(cb);
    return cancelAnimationFrame.bind(null, handle);
  }, [tickRef]);
  return (
    <p className="inline ml-3">
      {Math.trunc(lastUpdate / 1000)}:
      {(lastUpdate % 1000).toString().padStart(3, "0")}
    </p>
  );
}

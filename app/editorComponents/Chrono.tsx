import { memo, RefObject, useEffect, useState } from "react";

export const Chrono = memo(function Chrono({
  tickRef,
}: {
  tickRef: RefObject<number>;
}) {
  const [lastUpdate, setLastUpdate] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => setLastUpdate(tickRef.current), 1000);
    return () => clearTimeout(handle);
  }, [tickRef]);

  const sec = Math.trunc(lastUpdate / 1000);
  return (
    <p className="inline ml-3">
      {Math.trunc(sec / 60)}:{(sec % 60).toString().padStart(2, "0")}
    </p>
  );
});

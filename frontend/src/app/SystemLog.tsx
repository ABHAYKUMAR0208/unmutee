import { useEffect, useRef } from "react";

export type LogItem = {
  id: string;
  type: "info" | "success" | "warn" | "error";
  text: string;
};

export const timestamp = () =>
  new Date().toLocaleTimeString("en-GB", { hour12: false });

export const makeLogItem = (
  text: string,
  type: LogItem["type"] = "info",
): LogItem => ({
  id: `${Date.now()}-${Math.random()}`,
  type,
  text: `${timestamp()}  ${text}`,
});

const SystemLog = ({ logs }: { logs: LogItem[] }) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div
      ref={logRef}
      className="log-console flex-1 bg-black/40 border border-white/5 rounded-xl p-4 overflow-y-auto shadow-inner"
    >
      {logs.map((l) => (
        <div key={l.id} className={`log-line ${l.type}`}>
          {l.text}
        </div>
      ))}
    </div>
  );
};

export default SystemLog;

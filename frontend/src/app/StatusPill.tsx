export type PillStatus = "idle" | "connecting" | "connected" | "error";

const StatusPill = ({
  status = "idle",
  text = "Disconnected",
}: {
  status?: PillStatus;
  text?: string;
}) => {
  const stateClass =
    status === "connected"
      ? "connected"
      : status === "connecting"
        ? "connecting"
        : status === "error"
          ? "error"
          : "";

  return (
    <div
      className={`status-pill inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-sm font-medium border border-white/10 bg-white/5 text-lightgray ${stateClass}`}
    >
      <span className="status-dot w-2.5 h-2.5 rounded-full bg-lightgray" />
      <span>{text}</span>
    </div>
  );
};

export default StatusPill;

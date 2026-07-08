import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 20;

type Bar = { h: number; cls: "" | "mic-active" | "agent-active" };

const emptyBars = (): Bar[] =>
  Array.from({ length: BAR_COUNT }, () => ({ h: 4, cls: "" }));

const average = (data: Uint8Array) => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return data.length ? sum / data.length : 0;
};

/**
 * Audio Stream card: a 20-bar equalizer (left half driven by the user's mic,
 * right half by the agent's voice) plus level meters, in the visual style of
 * Voice-AI-Agent-UI's DemoVisualizer/LevelMeter, but reading from the real
 * Web Audio AnalyserNodes that Unmute already creates in useAudioProcessor.
 */
const AudioBars = ({
  micAnalyser,
  agentAnalyser,
  isConnected,
}: {
  micAnalyser: AnalyserNode | null;
  agentAnalyser: AnalyserNode | null;
  isConnected: boolean;
}) => {
  const [bars, setBars] = useState<Bar[]>(emptyBars());
  const [micLevel, setMicLevel] = useState(0);
  const [agentLevel, setAgentLevel] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setBars(emptyBars());
      setMicLevel(0);
      setAgentLevel(0);
      return;
    }

    const micData = micAnalyser
      ? new Uint8Array(micAnalyser.frequencyBinCount)
      : null;
    const agentData = agentAnalyser
      ? new Uint8Array(agentAnalyser.frequencyBinCount)
      : null;

    const tick = () => {
      let micAvg = 0;
      if (micAnalyser && micData) {
        micAnalyser.getByteFrequencyData(micData);
        micAvg = average(micData);
      }
      let agentAvg = 0;
      if (agentAnalyser && agentData) {
        agentAnalyser.getByteFrequencyData(agentData);
        agentAvg = average(agentData);
      }

      setMicLevel(micAvg);
      setAgentLevel(agentAvg);

      setBars(
        Array.from({ length: BAR_COUNT }, (_, i) => {
          const isMic = i < BAR_COUNT / 2;
          const base = isMic ? micAvg : agentAvg;
          const noise = Math.random() * base * 0.5;
          const h = Math.min(48, Math.max(4, (base + noise) * 0.5));
          const cls: Bar["cls"] = isMic
            ? micAvg > 5
              ? "mic-active"
              : ""
            : agentAvg > 5
              ? "agent-active"
              : "";
          return { h, cls };
        }),
      );

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [micAnalyser, agentAnalyser, isConnected]);

  return (
    <div>
      <div className="flex items-end justify-center gap-1 h-12 my-8">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={`viz-bar-demo ${bar.cls}`}
            style={{ height: `${bar.h}px` }}
          />
        ))}
      </div>
      <div className="space-y-4">
        <LevelMeter label="Your Mic" value={micLevel} colorClass="bg-blue-500" />
        <LevelMeter label="AI Agent" value={agentLevel} colorClass="bg-brand" />
      </div>
    </div>
  );
};

const LevelMeter = ({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) => (
  <div className="flex items-center gap-4 text-xs text-textgray">
    <span className="w-20 font-medium">{label}</span>
    <div className="flex-1 h-1.5 bg-background border border-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-75 ${colorClass}`}
        style={{ width: `${Math.min(100, value * 1.2)}%` }}
      />
    </div>
    <span className="w-8 text-right font-mono text-lightgray log-console">
      {Math.round(value)}
    </span>
  </div>
);

export default AudioBars;

"use client";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useCallback, useEffect, useState } from "react";
import { useMicrophoneAccess } from "./useMicrophoneAccess";
import { base64DecodeOpus, base64EncodeOpus } from "./audioUtil";
import SlantedButton from "@/app/SlantedButton";
import { useAudioProcessor as useAudioProcessor } from "./useAudioProcessor";
import useKeyboardShortcuts from "./useKeyboardShortcuts";
import { prettyPrintJson } from "pretty-print-json";
import UnmuteConfigurator, {
  DEFAULT_UNMUTE_CONFIG,
  UnmuteConfig,
} from "./UnmuteConfigurator";
import CouldNotConnect, { HealthStatus } from "./CouldNotConnect";
import UnmuteHeader from "./UnmuteHeader";
import Subtitles from "./Subtitles";
import { ChatMessage, compressChatHistory } from "./chatHistory";
import useWakeLock from "./useWakeLock";
import ErrorMessages, { ErrorItem, makeErrorItem } from "./ErrorMessages";
import { useRecordingCanvas } from "./useRecordingCanvas";
import { useGoogleAnalytics } from "./useGoogleAnalytics";
import { useBackendServerUrl } from "./useBackendServerUrl";
import { RECORDING_CONSENT_STORAGE_KEY } from "./ConsentModal";
import StatusPill, { PillStatus } from "./StatusPill";
import AudioBars from "./AudioBars";
import TranscriptPanel from "./TranscriptPanel";
import SystemLog, { LogItem, makeLogItem } from "./SystemLog";
import { Plug, Activity, MessageSquare, Terminal } from "lucide-react";

const Unmute = () => {
  const { isDevMode, showSubtitles } = useKeyboardShortcuts();
  const [debugDict, setDebugDict] = useState<object | null>(null);
  const [unmuteConfig, setUnmuteConfig] = useState<UnmuteConfig>(
    DEFAULT_UNMUTE_CONFIG,
  );
  const [rawChatHistory, setRawChatHistory] = useState<ChatMessage[]>([]);
  const chatHistory = compressChatHistory(rawChatHistory);

  const { microphoneAccess, askMicrophoneAccess } = useMicrophoneAccess();

  const [shouldConnect, setShouldConnect] = useState(false);
  const backendServerUrl = useBackendServerUrl();
  const [webSocketUrl, setWebSocketUrl] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([
    makeLogItem("Unmute UI ready — click 'connect' to start talking."),
  ]);
  const addLog = useCallback(
    (text: string, type: LogItem["type"] = "info") => {
      setLogs((prev) => [...prev, makeLogItem(text, type)]);
    },
    [],
  );

  useWakeLock(shouldConnect);
  const { analyticsOnDownloadRecording } = useGoogleAnalytics({
    shouldConnect,
    unmuteConfig,
  });

  // Check if the backend server is healthy. If we setHealthStatus to null,
  // a "server is down" screen will be shown.
  useEffect(() => {
    if (!backendServerUrl) return;

    setWebSocketUrl(backendServerUrl.toString() + "/v1/realtime");

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${backendServerUrl}/v1/health`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (!response.ok) {
          setHealthStatus({
            connected: "yes_request_fail",
            ok: false,
          });
        }
        const data = await response.json();
        data["connected"] = "yes_request_ok";

        if (data.ok && !data.voice_cloning_up) {
          console.debug("Voice cloning not available, hiding upload button.");
        }
        setHealthStatus(data);
        addLog(
          data.ok ? "Backend is healthy." : "Backend responded with errors.",
          data.ok ? "success" : "warn",
        );
      } catch {
        setHealthStatus({
          connected: "no",
          ok: false,
        });
        addLog("Could not reach the backend server.", "error");
      }
    };

    checkHealth();
  }, [backendServerUrl, addLog]);

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    webSocketUrl || null,
    {
      protocols: ["realtime"],
    },
    shouldConnect,
  );

  // Send microphone audio to the server (via useAudioProcessor below)
  const onOpusRecorded = useCallback(
    (opus: Uint8Array) => {
      sendMessage(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: base64EncodeOpus(opus),
        }),
      );
    },
    [sendMessage],
  );

  const { setupAudio, shutdownAudio, audioProcessor } =
    useAudioProcessor(onOpusRecorded);
  const {
    canvasRef: recordingCanvasRef,
    downloadRecording,
    recordingAvailable,
  } = useRecordingCanvas({
    size: 1080,
    shouldRecord: shouldConnect,
    audioProcessor: audioProcessor.current,
    chatHistory: rawChatHistory,
  });

  const onConnectButtonPress = async () => {
    // If we're not connected yet
    if (!shouldConnect) {
      addLog("Requesting microphone access...");
      const mediaStream = await askMicrophoneAccess();
      // If we have access to the microphone:
      if (mediaStream) {
        await setupAudio(mediaStream);
        setShouldConnect(true);
        addLog("Microphone ready, connecting to Unmute...", "success");
      } else {
        addLog("Microphone access was denied.", "error");
      }
    } else {
      setShouldConnect(false);
      shutdownAudio();
      addLog("Disconnected.", "warn");
    }
  };

  const onDownloadRecordingButtonPress = () => {
    try {
      downloadRecording(false);
      analyticsOnDownloadRecording();
      addLog("Recording downloaded.", "success");
    } catch (e) {
      if (e instanceof Error) {
        setErrors((prev) => [...prev, makeErrorItem(e.message)]);
        addLog(`Download failed: ${e.message}`, "error");
      }
    }
  };

  // If the websocket connection is closed, shut down the audio processing
  useEffect(() => {
    if (readyState === ReadyState.CLOSING || readyState === ReadyState.CLOSED) {
      setShouldConnect(false);
      shutdownAudio();
    }
  }, [readyState, shutdownAudio]);

  // Handle incoming messages from the server
  useEffect(() => {
    if (lastMessage === null) return;

    const data = JSON.parse(lastMessage.data);
    if (data.type === "response.audio.delta") {
      const opus = base64DecodeOpus(data.delta);
      const ap = audioProcessor.current;
      if (!ap) return;

      ap.decoder.postMessage(
        {
          command: "decode",
          pages: opus,
        },
        [opus.buffer],
      );
    } else if (data.type === "unmute.additional_outputs") {
      setDebugDict(data.args.debug_dict);
    } else if (data.type === "error") {
      if (data.error.type === "warning") {
        console.warn(`Warning from server: ${data.error.message}`, data);
        addLog(`Warning: ${data.error.message}`, "warn");
      } else {
        console.error(`Error from server: ${data.error.message}`, data);
        setErrors((prev) => [...prev, makeErrorItem(data.error.message)]);
        addLog(`Error: ${data.error.message}`, "error");
      }
    } else if (
      data.type === "conversation.item.input_audio_transcription.delta"
    ) {
      // Transcription of the user speech
      setRawChatHistory((prev) => [
        ...prev,
        { role: "user", content: data.delta },
      ]);
    } else if (data.type === "response.text.delta") {
      // Text-to-speech output
      setRawChatHistory((prev) => [
        ...prev,
        // The TTS doesn't include spaces in its messages, so add a leading space.
        // This way we'll get a leading space at the very beginning of the message,
        // but whatever.
        { role: "assistant", content: " " + data.delta },
      ]);
    } else {
      const ignoredTypes = [
        "session.updated",
        "response.created",
        "response.text.delta",
        "response.text.done",
        "response.audio.done",
        "conversation.item.input_audio_transcription.delta",
        "input_audio_buffer.speech_stopped",
        "input_audio_buffer.speech_started",
        "unmute.interrupted_by_vad",
        "unmute.response.text.delta.ready",
        "unmute.response.audio.delta.ready",
      ];
      if (!ignoredTypes.includes(data.type)) {
        console.warn("Received unknown message:", data);
      }
    }
  }, [audioProcessor, lastMessage, addLog]);

  // When we connect, we send the initial config (voice and instructions) to the server.
  // Also clear the chat history.
  useEffect(() => {
    if (readyState !== ReadyState.OPEN) return;

    const recordingConsent =
      localStorage.getItem(RECORDING_CONSENT_STORAGE_KEY) === "true";

    setRawChatHistory([]);
    sendMessage(
      JSON.stringify({
        type: "session.update",
        session: {
          instructions: unmuteConfig.instructions,
          voice: unmuteConfig.voice,
          allow_recording: recordingConsent,
        },
      }),
    );
    addLog(`Connected — voice set to "${unmuteConfig.voiceName}".`, "success");
  }, [unmuteConfig, readyState, sendMessage, addLog]);

  // Disconnect when the voice or instruction changes.
  // TODO: If it's a voice change, immediately reconnect with the new voice.
  useEffect(() => {
    setShouldConnect(false);
    shutdownAudio();
  }, [shutdownAudio, unmuteConfig.voice, unmuteConfig.instructions]);

  if (!healthStatus || !backendServerUrl) {
    return (
      <div className="w-full min-h-screen flex flex-col gap-4 items-center justify-center bg-background text-white">
        <h1 className="text-xl mb-4" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          Loading...
        </h1>
      </div>
    );
  }

  if (healthStatus && !healthStatus.ok) {
    return <CouldNotConnect healthStatus={healthStatus} />;
  }

  // Derive a status-pill state from the real connection state.
  const pillStatus: PillStatus = !shouldConnect
    ? "idle"
    : readyState === ReadyState.OPEN
      ? "connected"
      : readyState === ReadyState.CONNECTING
        ? "connecting"
        : "error";
  const pillText = !shouldConnect
    ? "Disconnected"
    : readyState === ReadyState.OPEN
      ? "Connected"
      : readyState === ReadyState.CONNECTING
        ? "Connecting..."
        : "Connection issue";

  return (
    <div className="w-full min-h-screen bg-background text-white">
      <div className="noise-overlay" />
      <ErrorMessages errors={errors} setErrors={setErrors} />
      <UnmuteHeader />

      {/* The main dashboard, styled after Voice-AI-Agent-UI's Live Demo section */}
      <div className="relative pt-28 md:pt-32 pb-16 px-4">
        <div className="absolute inset-0 flex justify-center pointer-events-none opacity-50">
          <div className="h-[400px] w-[600px] rounded-full bg-brand/5 blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Status pill */}
          <div className="flex justify-center mb-10">
            <StatusPill status={pillStatus} text={pillText} />
          </div>

          {showSubtitles && <Subtitles chatHistory={chatHistory} />}

          {/* Dashboard grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* ── Left column ── */}
            <div className="space-y-8">
              {/* Character & voice card */}
              <div className="bg-card border border-white/5 rounded-2xl p-2 sm:p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-2 px-3 sm:px-3 pt-3">
                  <Plug className="w-4 h-4 text-lightgray" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-textgray">
                    Character &amp; Voice
                  </h3>
                </div>
                <UnmuteConfigurator
                  backendServerUrl={backendServerUrl}
                  config={unmuteConfig}
                  setConfig={setUnmuteConfig}
                  voiceCloningUp={healthStatus.voice_cloning_up || false}
                />
              </div>

              {/* Audio visualizer card */}
              <div className="bg-card border border-white/5 rounded-2xl p-7 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-lightgray" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-textgray">
                    Audio Stream
                  </h3>
                </div>
                <AudioBars
                  micAnalyser={audioProcessor.current?.inputAnalyser || null}
                  agentAnalyser={audioProcessor.current?.outputAnalyser || null}
                  isConnected={shouldConnect}
                />
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="space-y-8 flex flex-col h-full">
              {/* Transcript card */}
              <div className="bg-card border border-white/5 rounded-2xl p-7 shadow-xl flex-1 flex flex-col min-h-[220px]">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-lightgray" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-textgray">
                    Conversation Transcript
                  </h3>
                </div>
                <TranscriptPanel chatHistory={chatHistory} />
              </div>

              {/* System log card */}
              <div className="bg-card border border-white/5 rounded-2xl p-7 shadow-xl h-[280px] flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-4 h-4 text-lightgray" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-textgray">
                    System Log
                  </h3>
                </div>
                <SystemLog logs={logs} />
              </div>
            </div>
          </div>

          {/* Connect / disconnect / download controls */}
          <div className="w-full flex flex-col-reverse md:flex-row items-center justify-center px-3 gap-3 mt-10">
            <SlantedButton
              onClick={onDownloadRecordingButtonPress}
              kind={recordingAvailable ? "secondary" : "disabled"}
              extraClasses="w-full max-w-96"
            >
              {"download recording"}
            </SlantedButton>
            <SlantedButton
              onClick={onConnectButtonPress}
              kind={shouldConnect ? "secondary" : "primary"}
              extraClasses="w-full max-w-96"
            >
              {shouldConnect ? "disconnect" : "connect"}
            </SlantedButton>
            {microphoneAccess === "refused" && (
              <div className="text-red">
                {"You'll need to allow microphone access to use the demo. " +
                  "Please check your browser settings."}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Debug stuff, not counted into the screen height */}
      {isDevMode && (
        <div>
          <div className="text-xs w-full overflow-auto">
            <pre
              className="whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{
                __html: prettyPrintJson.toHtml(debugDict),
              }}
            ></pre>
          </div>
          <div>Subtitles: press S. Dev mode: press D.</div>
        </div>
      )}
      <canvas ref={recordingCanvasRef} className="hidden" />
    </div>
  );
};

export default Unmute;

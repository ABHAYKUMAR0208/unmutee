import Modal from "./Modal";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import kyutaiLogo from "../assets/kyutai-logo-cropped.svg";

const ShortExplanation = () => {
  return (
    <>
      <p className="text-xs text-right text-textgray">
        Speak to an AI using our low-latency open-source{" "}
        <Link
          href="https://kyutai.org/stt"
          className="underline text-brand"
          target="_blank"
          rel="noopener"
        >
          speech-to-text
        </Link>{" "}
        and{" "}
        <Link
          href="https://kyutai.org/tts"
          className="underline text-brand"
          target="_blank"
          rel="noopener"
        >
          text-to-speech
        </Link>
        .
      </p>
      <p className="text-xs text-right text-textgray">
        Also check out{" "}
        <Link
          href="https://kyutai.org/pocket-tts?ref=unmute"
          className="underline text-brand"
          target="_blank"
          rel="noopener"
        >
          Pocket TTS
        </Link>
        , our new tiny TTS model with voice cloning!
      </p>
    </>
  );
};

const UnmuteHeader = () => {
  return (
    <nav className="fixed w-full top-0 backdrop-blur-xl z-40 bg-background/85 border-b border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-center gap-2 md:gap-6 px-4 md:px-6 py-3 md:h-16">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <h1
            className="text-2xl font-bold tracking-wide"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            <span className="text-white">UN</span>
            <span className="gradient-text-gold">MUTE</span>
          </h1>
          <span className="flex items-center gap-1.5 text-xs text-lightgray">
            by
            <Link href="https://kyutai.org" target="_blank" rel="noopener">
              <img src={kyutaiLogo.src} alt="Kyutai logo" className="w-16" />
            </Link>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col gap-0.5">
            <ShortExplanation />
          </div>
          <Modal
            trigger={
              <span className="flex items-center gap-1 text-sm font-semibold text-brand whitespace-nowrap">
                More info <ArrowUpRight size={16} />
              </span>
            }
            forceFullscreen={true}
          >
        <div className="flex flex-col gap-3">
          <p>
            This is a cascaded system made by Kyutai: our speech-to-text
            transcribes what you say, an LLM (we use GPT OSS 120B)
            generates the text of the response, and we then use our
            text-to-speech model to say it out loud.
          </p>
          <p>
            All of the components are open-source:{" "}
            <Link
              href="https://kyutai.org/stt"
              target="_blank"
              rel="noopener"
              className="underline text-green"
            >
              Kyutai STT
            </Link>
            ,{" "}
            <Link
              href="https://kyutai.org/tts"
              target="_blank"
              rel="noopener"
              className="underline text-green"
            >
              Kyutai TTS 1.6B
            </Link>
            , and{" "}
            <Link
              href="https://kyutai.org/unmute"
              target="_blank"
              rel="noopener"
              className="underline text-green"
            >
              Unmute
            </Link>{" "}
            itself.
          </p>
          <p>
            Although cascaded systems lose valuable information like emotion,
            irony, etc., they provide unmatched modularity: since the three
            parts are separate, you can <em>Unmute</em> any LLM you want without
            any finetuning or adaptation! In this demo, you can get a feel for
            this versatility by tuning the system prompt of the LLM to handcraft
            the personality of your digital interlocutor, and independently
            changing the voice of the TTS.
          </p>
          <p>
            Both the speech-to-text and text-to-speech models are optimized for
            low latency. The STT model is streaming and integrates semantic
            voice activity detection instead of relying on an external model.
            The TTS is streaming both in audio and in text, meaning it can start
            speaking before the entire LLM response is generated. You can use a
            10-second voice sample to determine the TTS{"'"}s voice and
            intonation. Check out the{" "}
            <Link
              href="https://arxiv.org/pdf/2509.08753"
              target="_blank"
              rel="noopener"
              className="underline text-green"
            >
              pre-print
            </Link>{" "}
            for details.
          </p>
          <p>
            To stay up to date on our research, follow us on{" "}
            <Link
              href="https://twitter.com/kyutai_labs"
              target="_blank"
              rel="noopener"
              className="underline text-green"
            >
              X/Twitter
            </Link>{" "}
            or{" "}
            <Link
              href="https://www.linkedin.com/company/kyutai-labs"
              target="_blank"
              rel="noopener"
              className="underline text-green"
            >
              LinkedIn
            </Link>.
          </p>
          <p>
            For questions or feedback:{" "}
            <Link
              href="mailto:unmute@kyutai.org"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              unmute@kyutai.org
            </Link>
          </p>
        </div>
      </Modal>
        </div>
      </div>
    </nav>
  );
};

export default UnmuteHeader;

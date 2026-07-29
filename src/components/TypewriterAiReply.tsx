import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function stripHtmlToText(html: string): string {
  const t = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  if (typeof document === "undefined") {
    return t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const d = document.createElement("div");
  d.innerHTML = t;
  return (d.textContent || "").replace(/\s+/g, " ").trim();
}

/** 短回复直接展示富文本，避免无意义抖动 */
const MIN_PLAIN_LENGTH = 32;
/** 目标打字总时长上限（长文会加大每跳步长） */
const TARGET_TYPE_MS = 1100;
const TICK_MS = 18;

type Phase = "plain" | "full";

export function TypewriterAiReply({
  html,
  className,
  active,
  onComplete,
}: {
  html: string;
  className?: string;
  /** 仅对「本轮刚完成」的助手消息为 true（历史/恢复会话为 false） */
  active: boolean;
  onComplete?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("full");
  const [plainShown, setPlainShown] = useState("");
  const reduceMotionRef = useRef(false);
  /**
   * 关键：如果这条回复曾在 active=false 时就已经展示过文字，
   * 后续即使 active 变为 true（比如图片/轮询结果回来导致状态更新），
   * 也不要再启动打字机，避免“先展示文字→又二次打字机重放”的别扭体验。
   */
  const suppressTypewriterRef = useRef(false);
  /** 打字机已完成一次后，不要因 html 变更重复播放 */
  const hasCompletedTypewriterRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!html.trim()) {
      setPhase("full");
      setPlainShown("");
      suppressTypewriterRef.current = false;
      hasCompletedTypewriterRef.current = false;
      return;
    }
    if (!active) {
      suppressTypewriterRef.current = true;
    }
    if (!active || reduceMotionRef.current || suppressTypewriterRef.current) {
      setPhase("full");
      setPlainShown("");
      return;
    }
    if (hasCompletedTypewriterRef.current) {
      setPhase("full");
      setPlainShown("");
      return;
    }

    const plain = stripHtmlToText(html);
    if (plain.length < MIN_PLAIN_LENGTH) {
      setPhase("full");
      setPlainShown("");
      return;
    }

    const steps = Math.max(8, Math.ceil(TARGET_TYPE_MS / TICK_MS));
    const chunk = Math.max(1, Math.ceil(plain.length / steps));

    setPhase("plain");
    setPlainShown("");

    let i = 0;
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled) return;
      i = Math.min(plain.length, i + chunk);
      setPlainShown(plain.slice(0, i));
      if (i >= plain.length) {
        window.clearInterval(id);
        hasCompletedTypewriterRef.current = true;
        setPhase("full");
        onCompleteRef.current?.();
      }
    }, TICK_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [html, active]);

  if (!html.trim()) return null;

  if (phase === "plain") {
    return (
      <div
        className={cn(className, "relative cursor-text select-text")}
        aria-busy="true"
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {plainShown}
          <span
            className="inline-block w-px min-h-[1em] translate-y-0.5 bg-neutral-600 ml-0.5 animate-pulse"
            aria-hidden
          />
        </p>
        <span className="sr-only">回复正在逐字显示</span>
      </div>
    );
  }

  return (
    <motion.div
      className={cn(className, "cursor-text select-text")}
      dangerouslySetInnerHTML={{ __html: html }}
      initial={{ opacity: 0.92, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

// Thin embed of Daily's own Prebuilt call UI (spec §4: Daily owns camera,
// mic, WebRTC and browser permissions — we never touch any of that
// directly). We keep our own "End Consultation" button outside this
// component so ending a call always goes through our state-machine API
// first, not just Daily's own leave button.
export function DailyCallFrame({
  roomUrl,
  token,
  onLeft,
}: {
  roomUrl: string;
  token: string;
  onLeft?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const call = DailyIframe.createFrame(containerRef.current, {
      showLeaveButton: false,
      showFullscreenButton: true,
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
        borderRadius: "1rem",
      },
    });
    callRef.current = call;
    call.on("left-meeting", () => onLeft?.());
    call.join({ url: roomUrl, token }).catch((err) => console.error("Daily join failed", err));

    return () => {
      call.destroy();
      callRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, token]);

  return <div ref={containerRef} className="w-full aspect-video rounded-2xl overflow-hidden bg-neutral-900" />;
}

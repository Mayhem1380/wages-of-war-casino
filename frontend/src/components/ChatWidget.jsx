import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { sfx } from "@/lib/sounds";

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const sc = useRef(null);

  useEffect(() => {
    sfx.prime();
  }, []);

  useEffect(() => {
    if (sc.current) sc.current.scrollTop = sc.current.scrollHeight;
  }, [messages, open]);

  const send = async () => {
    if (!text.trim()) return;
    const m = {
      id: Date.now(),
      who: user ? user.name : "you",
      text: text.trim(),
    };
    setMessages((s) => [...s, m]);
    setText("");
    try {
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: m.text }),
        credentials: "include",
      });
      const d = await res.json();
      setMessages((s) => [
        ...s,
        { id: Date.now() + 1, who: "bot", text: d.reply },
      ]);
    } catch (e) {
      setMessages((s) => [
        ...s,
        { id: Date.now() + 2, who: "bot", text: "Service unavailable" },
      ]);
    }
  };

  return (
    <div className="fixed right-4 bottom-6 z-50">
      <div
        className={`w-80 bg-black/90 border border-border rounded-md overflow-hidden shadow-lg ${open ? "h-96" : "h-12"}`}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <div className="flex-1 font-stencil uppercase text-sm">
            Ops Assistant
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="font-mono text-xs text-muted-foreground"
          >
            {open ? "Close" : "Help"}
          </button>
        </div>
        {open && (
          <div className="flex flex-col h-[calc(100%-44px)]">
            <div
              ref={sc}
              className="flex-1 overflow-auto p-3 space-y-2 text-sm"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.75))",
              }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`py-1 ${m.who === "bot" ? "text-gold" : "text-foreground"}`}
                >
                  <div className="font-mono text-[11px] opacity-70">
                    {m.who}
                  </div>
                  <div className="mt-1">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-border flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask about deposits, withdrawals, KYC..."
                className="flex-1 bg-black/60 border border-border px-3 py-2 font-mono text-sm outline-none"
              />
              <button
                onClick={() => {
                  sfx.click();
                  send();
                }}
                className="bg-nvg px-3 py-2 text-black font-stencil"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

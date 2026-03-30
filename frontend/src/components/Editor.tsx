import React, { useEffect, useState, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import "./Editor.css";

interface EditorProps {
  docId: string;
}

export const Editor: React.FC<EditorProps> = ({ docId }) => {
  const [status, setStatus] = useState("Connecting...");
  const wsRef = useRef<WebSocket | null>(null);

  // Isolate document state scoped to this specific docId
  const { ydoc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const aw = new Awareness(doc);
    return {
      ydoc: doc,
      provider: {
        on: () => { },
        off: () => { },
        awareness: aw,
        document: doc,
      }
    };
  }, [docId]);

  useEffect(() => {
    function connect() {
      if (wsRef.current) return;

      console.log("[WS] Connecting...");
      const ws = new WebSocket(`ws://localhost:3001/?docId=${docId}`);
      wsRef.current = ws;

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("[WS] Connected");
        setStatus("Connected");
      };

      ws.onmessage = (event) => {
        const update = new Uint8Array(event.data);
        // Apply remote update to our local document, tagging the origin as 'ws' 
        // to prevent echoing the same update back visually.
        Y.applyUpdate(ydoc, update, ws);
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected");
        setStatus("Disconnected");
        wsRef.current = null;
        setTimeout(connect, 1000);
      };

      ws.onerror = (err) => {
        console.error("[WS] Error", err);
        setStatus("Error");
      };
    }

    connect();

    // The update event fires natively whenever the Ydoc changes locally OR remotely.
    const handleUpdate = (update: Uint8Array, origin: any) => {
      const ws = wsRef.current;
      // Only broadcast if the update was generated locally (not received via websocket)
      if (ws && ws.readyState === WebSocket.OPEN && origin !== ws) {
        ws.send(update);
      }
    };

    ydoc.on("update", handleUpdate);

    return () => {
      ydoc.off("update", handleUpdate);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      ydoc.destroy();
    };
  }, [docId, ydoc]);

  // Set randomized cursor color logic mapped to this particular instance instance
  const userColor = useMemo(() => {
    const colors = ["#f783ac", "#8ce99a", "#74c0fc", "#ffd43b", "#ffa94d", "#b197fc"];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The Yjs history handles the undo/redo functionality
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider as any,
        user: {
          name: "User " + Math.floor(Math.random() * 1000),
          color: userColor,
        },
      }),
    ],
    content: "",
  });

  return (
    <div className="editor-wrapper">
      <div className="status-bar">
        <span className={`status-icon ${status.includes("Connected") ? "online" : "offline"}`}></span>
        {status}
      </div>
      <div className="tiptap-container">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default Editor;

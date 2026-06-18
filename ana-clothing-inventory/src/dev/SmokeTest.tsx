// SmokeTest — Development-only component for Phase 2+3 verification
// Isolated from App.tsx to keep UI shell clean.

import { useEffect, useState } from "react";
import { runSmokeTest } from "../engine/__test__";
import { getQueueStats } from "../sync/sync-queue";

export default function SmokeTest() {
  const [status, setStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [log, setLog] = useState<string[]>([]);
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    synced: 0,
    failed: 0,
  });

  useEffect(() => {
    if (status !== "idle") return;
    setStatus("running");

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
      originalLog.apply(console, args);
    };

    runSmokeTest()
      .then(async () => {
        setLog(logs);
        setStatus("done");
        console.log = originalLog;
        const stats = await getQueueStats();
        setQueueStats(stats);
      })
      .catch((err: Error) => {
        logs.push(`ERROR: ${err.message}`);
        setLog(logs);
        setStatus("error");
        console.log = originalLog;
      });
  }, [status]);

  return (
    <div style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>ANA Clothing Inventory — Phase 3: Sync Engine</h1>
      <p>
        Status: <strong>{status.toUpperCase()}</strong>
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div
          style={{ padding: "8px 16px", background: "#fff3cd", borderRadius: 4 }}
        >
          Pending: {queueStats.pending}
        </div>
        <div
          style={{ padding: "8px 16px", background: "#d4edda", borderRadius: 4 }}
        >
          Synced: {queueStats.synced}
        </div>
        <div
          style={{ padding: "8px 16px", background: "#f8d7da", borderRadius: 4 }}
        >
          Failed: {queueStats.failed}
        </div>
      </div>

      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 16,
          borderRadius: 8,
          minHeight: 200,
          whiteSpace: "pre-wrap",
        }}
      >
        {log.length === 0 && status === "running" && "Running..."}
        {log.join("\n")}
      </pre>

      {status === "done" && (
        <p style={{ color: "green", fontWeight: "bold" }}>
          ✅ All checks passed — Phase 3 complete
        </p>
      )}
      {status === "error" && (
        <p style={{ color: "red", fontWeight: "bold" }}>
          ❌ Smoke test failed — check logs above
        </p>
      )}
    </div>
  );
}
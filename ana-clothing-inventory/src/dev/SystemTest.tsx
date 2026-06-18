// System Test Harness — runs all 8 test modules and displays results
// Navigate to /system-test to run. Dev-only.

import { useState } from "react";
import { ALL_TESTS, type TestModule } from "./system-test";

export default function SystemTest() {
  const [modules, setModules] = useState<TestModule[]>([]);
  const [running, setRunning] = useState(false);
  const [opened, setOpened] = useState(false);

  async function runAll() {
    setRunning(true);
    setModules([]);
    setOpened(true);

    // IMPORTANT: Reset DB for clean test isolation.
    // System tests assume isolated IndexedDB state.
    // Module 7 stress data must not leak into Module 8.
    // Use raw IndexedDB API so Dexie connection stays open.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase("AnaClothingInventory");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    const results: TestModule[] = [];

    for (const testFn of ALL_TESTS) {
      try {
        const module = await testFn();
        results.push(module);
        setModules([...results]);
      } catch (err) {
        results.push({
          name: testFn.name,
          results: [
            { pass: false, message: `CRASHED: ${err instanceof Error ? err.message : String(err)}` },
          ],
        });
        setModules([...results]);
      }
    }

    setRunning(false);
  }

  const allPass =
    modules.length > 0 &&
    modules.every((m) => m.results.every((r) => r.pass));

  const totalTests = modules.reduce((sum, m) => sum + m.results.length, 0);
  const passedTests = modules.reduce(
    (sum, m) => sum + m.results.filter((r) => r.pass).length,
    0
  );

  return (
    <div style={{ padding: 24, fontFamily: "monospace", maxWidth: 800 }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>
        System Test Suite
      </h1>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
        Validates all 8 system layers. Tests clean up after themselves.
      </p>

      <button
        onClick={runAll}
        disabled={running}
        style={{
          padding: "10px 24px",
          background: running ? "#aaa" : "#1976d2",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: running ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 24,
        }}
      >
        {running ? "Running Tests..." : "Run All 8 Test Modules"}
      </button>

      {!opened && !running && (
        <p style={{ color: "#888" }}>Click the button above to run all tests.</p>
      )}

      {/* Summary */}
      {modules.length > 0 && !running && (
        <div
          style={{
            padding: 12,
            borderRadius: 6,
            background: allPass ? "#d4edda" : "#f8d7da",
            color: allPass ? "#155724" : "#721c24",
            marginBottom: 16,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {allPass
            ? `✅ ALL ${totalTests} TESTS PASSED`
            : `❌ ${passedTests}/${totalTests} tests passed — ${totalTests - passedTests} failed`}
        </div>
      )}

      {/* Module Results */}
      {modules.map((module) => {
        const modulePass = module.results.every((r) => r.pass);
        return (
          <div
            key={module.name}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              borderLeft: `4px solid ${modulePass ? "#388e3c" : "#d32f2f"}`,
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 14,
                fontWeight: 700,
                color: modulePass ? "#388e3c" : "#d32f2f",
              }}
            >
              {modulePass ? "✅" : "❌"} {module.name}
              <span style={{ fontWeight: 400, color: "#888", marginLeft: 8 }}>
                ({module.results.filter((r) => r.pass).length}/{module.results.length} passed)
              </span>
            </h2>

            {module.results.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "3px 0",
                  fontSize: 12,
                  color: r.pass ? "#388e3c" : "#d32f2f",
                }}
              >
                <span style={{ flexShrink: 0 }}>
                  {r.pass ? "✓" : "✗"}
                </span>
                <span style={{ color: "#333" }}>{r.message}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
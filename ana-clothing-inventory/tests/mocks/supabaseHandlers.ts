// MSW handlers — mocks Supabase REST API for sync engine testing
import { http, HttpResponse, delay } from "msw";

// In-memory store to simulate Supabase behavior
let storedEvents: unknown[] = [];

export function getStoredEvents(): unknown[] {
  return storedEvents;
}

export function clearStoredEvents(): void {
  storedEvents = [];
}

// Default success handlers
const baseSuccessHandlers = [
  // POST /inventory_events — accepts single or batch array
  http.post("*/inventory_events", async ({ request }) => {
    const body = await request.json();
    // Support both single event POST and batch POST (array)
    if (Array.isArray(body)) {
      storedEvents.push(...body);
    } else {
      storedEvents.push(body);
    }
    const first = Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : body;
    return HttpResponse.json({ success: true, id: (first as Record<string, unknown>)?.id ?? "supabase-id" }, { status: 201 });
  }),

  // GET /inventory_events — list events
  http.get("*/inventory_events", () => {
    return HttpResponse.json(storedEvents, { status: 200 });
  }),
];

export const handlers = baseSuccessHandlers;
export const successHandlers = baseSuccessHandlers;

// ---- Error simulation handlers ----

export function createFailureHandlers() {
  return [
    http.post("*/inventory_events", async () => {
      await delay(100);
      return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }),
    http.get("*/inventory_events", async () => {
      await delay(100);
      return HttpResponse.json({ error: "Service Unavailable" }, { status: 503 });
    }),
  ];
}

export function createTimeoutHandlers() {
  return [
    http.post("*/inventory_events", async () => {
      await delay(10_000); // never resolves in time
      return HttpResponse.json({}, { status: 200 });
    }),
    http.get("*/inventory_events", async () => {
      return HttpResponse.json([], { status: 200 });
    }),
  ];
}

export function createValidationErrorHandlers() {
  return [
    http.post("*/inventory_events", async () => {
      return HttpResponse.json({ error: "Validation failed: variant_id is required" }, { status: 400 });
    }),
    http.get("*/inventory_events", async () => {
      return HttpResponse.json([], { status: 200 });
    }),
  ];
}
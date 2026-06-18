// Test setup — polyfill IndexedDB + MSW lifecycle before any test code runs
import "fake-indexeddb/auto";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

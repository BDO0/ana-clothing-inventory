// UI tests — History page with React Testing Library
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import History from "../../src/pages/History";
import { createProduct } from "../../src/engine/product-service";
import { resetDatabase } from "../utils/testHelpers";
import "@testing-library/jest-dom/vitest";

describe("History page", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should render the History heading", async () => {
    render(<History />);

    await waitFor(() => {
      expect(screen.getByText("History")).toBeInTheDocument();
    });
  });

  it("should show filter selectors (product, variant, type)", async () => {
    await createProduct({ name: "Test Product" });

    render(<History />);

    await waitFor(() => {
      // Should have 3 select elements: Product, Variant, Type
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("should show placeholder text when nothing selected", async () => {
    render(<History />);

    await waitFor(() => {
      expect(screen.getByText("Select a product and variant")).toBeInTheDocument();
    });
  });
});
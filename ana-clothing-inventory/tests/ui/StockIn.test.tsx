// UI tests — Stock In page with React Testing Library
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StockIn from "../../src/pages/StockIn";
import { createProduct, createVariant } from "../../src/engine/product-service";
import { resetDatabase } from "../utils/testHelpers";
import "@testing-library/jest-dom/vitest";

describe("Stock In page", () => {
  let productId: string;
  let variantId: string;

  beforeEach(async () => {
    await resetDatabase();
    productId = await createProduct({ name: "Premium Tee" });
    variantId = await createVariant({ product_id: productId, size: "L", color: "White", sku: "PT-WHT-L" });
  });

  it("should render the Stock In heading", async () => {
    render(<StockIn />);

    await waitFor(() => {
      expect(screen.getByText("Stock In")).toBeInTheDocument();
    });
  });

  it("should display product and variant selectors", async () => {
    render(<StockIn />);

    await waitFor(() => {
      // The product select should be visible with label text "Product"
      expect(screen.getByText("Product")).toBeInTheDocument();
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(1);
      // Preview placeholder should show
      expect(screen.getByText("Select a product and variant")).toBeInTheDocument();
    });
  });

  it("should show current stock when a variant is selected", async () => {
    const user = userEvent.setup();
    render(<StockIn />);

    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText(/Premium Tee/i)).toBeInTheDocument();
    });

    // Select the product (first combobox = Product select)
    const selects = screen.getAllByRole("combobox");
    const productSelect = selects[0];
    await user.selectOptions(productSelect, productId);

    // Wait for variant selector to appear and select it
    await waitFor(() => {
      const updatedSelects = screen.getAllByRole("combobox");
      expect(updatedSelects.length).toBeGreaterThanOrEqual(2);
    });

    const finalSelects = screen.getAllByRole("combobox");
    const variantSelect = finalSelects[1];
    await user.selectOptions(variantSelect, variantId);

    // Should show current stock
    await waitFor(() => {
      expect(screen.getByText(/Current:/)).toBeInTheDocument();
    });
  });

  it("should show quantity input after selecting variant", async () => {
    const user = userEvent.setup();
    render(<StockIn />);

    await waitFor(() => {
      expect(screen.queryByText(/Premium Tee/i)).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], productId);

    await waitFor(() => {
      const updated = screen.getAllByRole("combobox");
      expect(updated.length).toBeGreaterThanOrEqual(2);
    });

    const finalSelects = screen.getAllByRole("combobox");
    await user.selectOptions(finalSelects[1], variantId);

    // Quantity input should appear
    await waitFor(() => {
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });
  });
});

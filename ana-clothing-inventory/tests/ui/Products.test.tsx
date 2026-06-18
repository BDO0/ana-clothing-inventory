// UI tests — Products page with React Testing Library
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Products from "../../src/pages/Products";
import { createProduct } from "../../src/engine/product-service";
import { resetDatabase } from "../utils/testHelpers";
import "@testing-library/jest-dom/vitest";

describe("Products page", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should render the Products heading", async () => {
    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText("Products")).toBeInTheDocument();
    });
  });

  it("should show empty state when no products exist", async () => {
    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText(/No products yet/)).toBeInTheDocument();
    });
  });

  it("should list products after creation", async () => {
    await createProduct({ name: "Test Hoodie" });
    await createProduct({ name: "Test Jeans" });

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText("Test Hoodie")).toBeInTheDocument();
      expect(screen.getByText("Test Jeans")).toBeInTheDocument();
    });

    // Should show count: "2 products"
    expect(screen.getByText("2 products")).toBeInTheDocument();
  });

  it("should open and close the Add Product modal", async () => {
    const user = userEvent.setup();
    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText("Products")).toBeInTheDocument();
    });

    // Click Add Product button (it shows "Add Product" text)
    const addButton = screen.getByRole("button", { name: /add product/i });
    await user.click(addButton);

    // Modal should be open
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Product name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    });

    // Click Cancel
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Product name")).not.toBeInTheDocument();
    });
  });

  it("should create a product via the modal form", async () => {
    const user = userEvent.setup();
    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText("Products")).toBeInTheDocument();
    });

    // Open modal
    await user.click(screen.getByRole("button", { name: /add product/i }));

    // Fill form
    const input = screen.getByPlaceholderText("Product name");
    await user.type(input, "New Design Tee");

    // Click Create
    await user.click(screen.getByRole("button", { name: "Create" }));

    // Wait for modal to close and product to appear
    await waitFor(() => {
      expect(screen.getByText("New Design Tee")).toBeInTheDocument();
    });

    // Count should be updated
    expect(screen.getByText("1 product")).toBeInTheDocument();
  });
});
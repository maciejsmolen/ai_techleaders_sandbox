import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DataTable, type DataTableColumn } from "./DataTable";

interface Person {
  id: string;
  name: string;
  age: number | null;
}

const columns: DataTableColumn<Person>[] = [
  { key: "name", header: "Name" },
  { key: "age", header: "Age" },
];

const people = (count: number): Person[] =>
  Array.from({ length: count }, (_, index) => ({ id: String(index), name: `Person ${index + 1}`, age: 20 + index }));

const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]!).getAllByRole("row");

describe("DataTable", () => {
  it("renders a header and one row per record, with default and custom cells", () => {
    render(
      <DataTable
        columns={[...columns, { key: "label", header: "Label", cell: (row) => <strong>{row.name.toUpperCase()}</strong> }]}
        rows={[{ id: "1", name: "Ada", age: null }]}
        getRowId={(row) => row.id}
      />,
    );

    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Name", "Age", "Label"]);
    expect(within(bodyRows()[0]!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Ada", "", "ADA"]);
  });

  it("shows the loading, error and empty states instead of the table", () => {
    const { rerender } = render(<DataTable columns={columns} rows={undefined} getRowId={(row) => row.id} isLoading />);
    expect(screen.getByRole("status")).toBeDefined();

    rerender(<DataTable columns={columns} rows={undefined} getRowId={(row) => row.id} error="Boom" />);
    expect(screen.getByRole("alert").textContent).toContain("Boom");

    rerender(<DataTable columns={columns} rows={[]} getRowId={(row) => row.id} emptyTitle="No people" />);
    expect(screen.getByText("No people")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("paginates and hides the controls when everything fits on one page", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataTable columns={columns} rows={people(5)} getRowId={(row) => row.id} pageSize={2} />);

    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByText("Page 1 of 3")).toBeDefined();
    expect(screen.getByRole("button", { name: "Previous" }).hasAttribute("disabled")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 3 of 3")).toBeDefined();
    expect(bodyRows().map((row) => row.textContent)).toEqual(["Person 524"]);

    // Fewer rows (e.g. after a delete): clamps to the last page that exists.
    rerender(<DataTable columns={columns} rows={people(3)} getRowId={(row) => row.id} pageSize={2} />);
    expect(screen.getByText("Page 2 of 2")).toBeDefined();

    rerender(<DataTable columns={columns} rows={people(2)} getRowId={(row) => row.id} pageSize={2} />);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("renders row actions in a trailing column", () => {
    render(
      <DataTable
        columns={columns}
        rows={people(1)}
        getRowId={(row) => row.id}
        rowActions={(row) => <button>Edit {row.name}</button>}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit Person 1" })).toBeDefined();
  });
});

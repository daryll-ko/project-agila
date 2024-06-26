import { type Column, type Table } from "@tanstack/react-table";

interface Props<T, U> {
  column: Column<T, U>;
  table: Table<T>;
}

export default function Filter<T, U>({ column, table }: Props<T, U>) {
  const firstValue = table
    .getPreFilteredRowModel()
    .flatRows[0]?.getValue(column.id);

  const columnFilterValue = column.getFilterValue();

  return typeof firstValue === "number" ? (
    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        value={(columnFilterValue as [number, number])?.[0] ?? ""}
        onChange={(e) =>
          column.setFilterValue((old: [number, number]) => [
            e.target.value,
            old?.[1],
          ])
        }
        min={0}
        placeholder={`Min`}
        className="w-16 rounded border px-1 shadow"
      />
      <input
        type="number"
        value={(columnFilterValue as [number, number])?.[1] ?? ""}
        onChange={(e) =>
          column.setFilterValue((old: [number, number]) => [
            old?.[0],
            e.target.value,
          ])
        }
        min={0}
        placeholder={`Max`}
        className="w-16 rounded border px-1 shadow"
      />
    </div>
  ) : (
    <input
      className="w-28 rounded border px-1 shadow"
      onChange={(e) => column.setFilterValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder={`Filter...`}
      type="text"
      value={(columnFilterValue ?? "") as string}
    />
  );
}

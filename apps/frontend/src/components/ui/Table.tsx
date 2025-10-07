import React, { useState, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (record: T) => void;
}

export const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyText = 'No data',
  onRowClick,
}: TableProps<T>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<T>();

    return columns.map(col =>
      columnHelper.accessor(col.dataIndex as any, {
        id: col.key,
        header: col.title,
        cell: ({ getValue, row }) => {
          const value = getValue();
          const record = row.original;
          return col.render ? col.render(value, record) : value;
        },
        enableSorting: col.sortable !== false,
      })
    );
  }, [columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize: 10 } },
  });

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent' />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Search */}
      <input
        type='text'
        placeholder='Search...'
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        className='px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
      />

      {/* Table */}
      <div className='overflow-hidden rounded-lg border border-gray-700'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-800'>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className='px-6 py-3 text-xs font-medium text-gray-300 uppercase tracking-wider text-left'
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center space-x-1 ${
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none'
                              : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {header.column.getCanSort() && (
                            <span className='text-gray-400'>
                              {{
                                asc: '↑',
                                desc: '↓',
                              }[header.column.getIsSorted() as string] ?? '↕'}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className='bg-gray-900 divide-y divide-gray-700'>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className='px-6 py-8 text-center text-gray-400'
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-700 hover:bg-gray-800 ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className='px-6 py-4 whitespace-nowrap text-sm text-white'
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <div className='text-sm text-gray-400'>
          Showing{' '}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}{' '}
          to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} results
        </div>
        <div className='flex items-center space-x-2'>
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className='px-3 py-1 text-sm bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700'
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className='px-3 py-1 text-sm bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700'
          >
            Previous
          </button>
          <span className='text-sm text-gray-400'>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className='px-3 py-1 text-sm bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700'
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className='px-3 py-1 text-sm bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700'
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Divider,
} from '@mui/material';

import { Box, Button, Select, MenuItem } from '@mui/material';

export default function TransactionsTable() {
  // Pagination state for cursor-based API
  const [pageSize, setPageSize] = React.useState(10);
  const [transactions, setTransactions] = React.useState([]);
  const [nextCursor, setNextCursor] = React.useState(null);
  const [prevCursor, setPrevCursor] = React.useState(null);
  const [currentCursor, setCurrentCursor] = React.useState(null);
  const [direction, setDirection] = React.useState('next');
  const [totalRows, setTotalRows] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  // Fetch transactions from backend
  const fetchTransactions = React.useCallback(
    (opts = {}) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', opts.pageSize ?? pageSize);
      if (opts.cursor) params.append('cursor', opts.cursor);
      if (opts.direction) params.append('direction', opts.direction);
      fetch(`${import.meta.env.VITE_STATS_API_URL}/metrics/transactions?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject('Failed to fetch transactions')))
        .then((data) => {
          setTransactions(data.transactions || []);
          setNextCursor(data.next_cursor || null);
          setPrevCursor(data.prev_cursor || null);
          setTotalRows(data.total || 0);
          setCurrentCursor(opts.cursor || null);
          setDirection(opts.direction || 'next');
        })
        .catch((err) => {
          setTransactions([]);
          setNextCursor(null);
          setPrevCursor(null);
          setTotalRows(0);
        })
        .finally(() => setLoading(false));
    },
    [pageSize],
  );

  // Initial load and when pageSize changes
  React.useEffect(() => {
    fetchTransactions({ pageSize, cursor: null, direction: 'next' });
  }, [pageSize, fetchTransactions]);

  const columns = React.useMemo(
    () => [
      {
        accessorKey: 'ts',
        header: 'Timestamp (UTC)',
        cell: (info) => (info.getValue() ? String(info.getValue()).replace('T', ' ') : ''),
      },
      {
        accessorKey: 'provider_wallet',
        header: 'Provider Wallet',
        cell: (info) => {
          const v = info.getValue();
          return v ? String(v).slice(0, 8) + '...' : '';
        },
      },
      {
        accessorKey: 'requester_wallet',
        header: 'Requester Wallet',
        cell: (info) => {
          const v = info.getValue();
          return v ? String(v).slice(0, 8) + '...' : '';
        },
      },
      {
        accessorKey: 'tx',
        header: 'Transaction Hash',
        cell: (info) => {
          const v = info.getValue();
          if (!v) return '';
          const short = String(v).slice(0, 8) + '...';
          return (
            <a
              href={`https://polygonscan.com/tx/${v}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1976d2', textDecoration: 'underline' }}
            >
              {short}
            </a>
          );
        },
      },
      //{ accessorKey: 'gpu', header: 'GPU' },
      // {
      //   accessorKey: 'ram',
      //   header: 'RAM (GB)',
      //   cell: (info) => {
      //     const v = info.getValue();
      //     return v ? Math.round(Number(v) / 1024) : '';
      //   },
      // },
      //{ accessorKey: 'vcpus', header: 'vCPUs' },
      //{ accessorKey: 'duration', header: 'Duration' },
      { accessorKey: 'invoiced_glm', header: 'GLM' },
      {
        accessorKey: 'invoiced_dollar',
        header: 'USD',
        cell: (info) => {
          const v = info.getValue();
          return v !== undefined && v !== null ? `$${v}` : '';
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* Pagination controls at the top */}
      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2} mb={2} mt={2}>
        <Typography
          variant="body2"
          sx={(theme) => ({
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          })}
        >
          Rows per page:
        </Typography>
        <Select
          size="small"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
          }}
          sx={(theme) => ({
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            '.MuiOutlinedInput-notchedOutline': {
              borderColor:
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            },
          })}
        >
          {[5, 10, 25, 50, 100].map((size) => (
            <MenuItem key={size} value={size} sx={{ color: 'inherit' }}>
              {size}
            </MenuItem>
          ))}
        </Select>
        <Button
          size="small"
          onClick={() =>
            fetchTransactions({
              pageSize,
              cursor: prevCursor,
              direction: 'prev',
            })
          }
          disabled={!prevCursor}
          sx={(theme) => ({
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          })}
        >
          Prev
        </Button>
        <Button
          size="small"
          onClick={() =>
            fetchTransactions({
              pageSize,
              cursor: null,
              direction: 'next',
            })
          }
          disabled={!prevCursor && !currentCursor}
          sx={(theme) => ({
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          })}
        >
          Latest
        </Button>
        <Button
          size="small"
          onClick={() =>
            fetchTransactions({
              pageSize,
              cursor: nextCursor,
              direction: 'next',
            })
          }
          disabled={!nextCursor}
          sx={(theme) => ({
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          })}
        >
          Next
        </Button>
      </Box>
      <Divider sx={{ mt: 2, mb: 2 }} />
      <TableContainer
        component={Paper}
        sx={{ mt: 0, mb: 1, pb: 1, boxShadow: 'none', borderRadius: 4, backgroundImage: 'none' }}
      >
        <Table size="small" sx={{ fontSize: '12px' }}>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    align="left"
                    sx={(theme) => ({
                      fontSize: '12px',
                      borderBottom: 1,
                      borderColor: 'divider',
                      fontWeight: 'bold',
                      color: theme.palette.primary.main,
                    })}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} sx={{ borderBottom: 'none' }}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      align="left"
                      sx={{ fontSize: '12px', borderBottom: 'none' }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell || cell.column.columnDef.header,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

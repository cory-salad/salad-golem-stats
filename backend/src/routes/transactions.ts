import { FastifyInstance } from "fastify";
import { query, queryOne } from "../db/connection.js";
import { createCacheHooks } from "../cache/redis.js";
import { Transaction, TransactionsResponse } from "../types/index.js";

interface TransactionsQuery {
  limit?: number;
  cursor?: string;
  direction?: "next" | "prev";
  sort_by?: "time" | "glm" | "block";
  sort_order?: "asc" | "desc";
}

interface TransactionRow {
  tx_hash: string;
  block_number: string | number;
  block_timestamp: Date;
  from_address: string;
  to_address: string;
  value_glm: string | number;
  tx_type: string;
}

const transactionsQuerySchema = {
  type: "object",
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    cursor: { type: "string" },
    direction: { type: "string", enum: ["next", "prev"], default: "next" },
    sort_by: { type: "string", enum: ["time", "glm", "block"], default: "time" },
    sort_order: { type: "string", enum: ["asc", "desc"], default: "desc" },
  },
};

export async function transactionsRoutes(
  fastify: FastifyInstance
): Promise<void> {
  const cacheHooks = createCacheHooks("transactions");

  fastify.get<{ Querystring: TransactionsQuery }>(
    "/metrics/transactions",
    {
      schema: { querystring: transactionsQuerySchema },
      preHandler: cacheHooks.preHandler,
      onSend: cacheHooks.onSend,
    },
    async (request) => {
      const limit = request.query.limit ?? 10;
      const cursor = request.query.cursor;
      const direction = request.query.direction ?? "next";
      const sortBy = request.query.sort_by ?? "time";
      const sortOrder = request.query.sort_order ?? "desc";

      // Count total transactions
      const totalRow = await queryOne<{ count: string }>(
        "SELECT COUNT(*) as count FROM glm_transactions"
      );
      const total = parseInt(totalRow?.count ?? "0", 10);

      // Determine sort column
      const sortColumnMap: Record<string, string> = {
        time: "block_timestamp",
        glm: "value_glm",
        block: "block_number",
      };
      const sortColumn = sortColumnMap[sortBy];
      const order = sortOrder.toUpperCase();

      // Build query
      let sql = `
        SELECT tx_hash, block_number, block_timestamp, from_address, to_address, value_glm, tx_type
        FROM glm_transactions
      `;
      const params: unknown[] = [];

      if (direction === "next") {
        if (cursor) {
          sql += ` WHERE ${sortColumn} < $1`;
          params.push(cursor);
        }
      } else {
        if (cursor) {
          sql += ` WHERE ${sortColumn} > $1`;
          params.push(cursor);
        }
      }

      sql += ` ORDER BY ${sortColumn} ${order} LIMIT $${params.length + 1}`;
      params.push(limit);

      let rows = await query<TransactionRow>(sql, params);

      // Always return newest first for UI consistency
      if (direction === "prev") {
        rows = rows.reverse();
      }

      const pageTransactions: Transaction[] = rows.map((r) => ({
        tx_hash: r.tx_hash,
        block_number:
          typeof r.block_number === "string"
            ? parseInt(r.block_number, 10)
            : r.block_number,
        block_timestamp:
          r.block_timestamp instanceof Date
            ? r.block_timestamp.toISOString()
            : String(r.block_timestamp),
        from_address: r.from_address,
        to_address: r.to_address,
        value_glm: parseFloat(String(r.value_glm)),
        tx_type: r.tx_type,
      }));

      // Determine cursors for navigation
      let nextCursor: string | null = null;
      let prevCursor: string | null = null;

      if (pageTransactions.length > 0) {
        if (direction === "next") {
          // Check if there are older records
          const olderCount = await queryOne<{ count: string }>(
            "SELECT COUNT(*) as count FROM glm_transactions WHERE block_timestamp < $1",
            [pageTransactions[pageTransactions.length - 1].block_timestamp]
          );
          if (parseInt(olderCount?.count ?? "0", 10) > 0) {
            nextCursor =
              pageTransactions[pageTransactions.length - 1].block_timestamp;
          }

          // Check if there are newer records
          const newerCount = await queryOne<{ count: string }>(
            "SELECT COUNT(*) as count FROM glm_transactions WHERE block_timestamp > $1",
            [pageTransactions[0].block_timestamp]
          );
          if (parseInt(newerCount?.count ?? "0", 10) > 0) {
            prevCursor = pageTransactions[0].block_timestamp;
          }
        } else {
          if (cursor) {
            // Check if there are newer records
            const newerCount = await queryOne<{ count: string }>(
              "SELECT COUNT(*) as count FROM glm_transactions WHERE block_timestamp > $1",
              [pageTransactions[0].block_timestamp]
            );
            if (parseInt(newerCount?.count ?? "0", 10) > 0) {
              prevCursor = pageTransactions[0].block_timestamp;
            }

            // Check if there are older records
            const olderCount = await queryOne<{ count: string }>(
              "SELECT COUNT(*) as count FROM glm_transactions WHERE block_timestamp < $1",
              [pageTransactions[pageTransactions.length - 1].block_timestamp]
            );
            if (parseInt(olderCount?.count ?? "0", 10) > 0) {
              nextCursor =
                pageTransactions[pageTransactions.length - 1].block_timestamp;
            }
          } else {
            // "Last" page - check if there are newer records
            const newerCount = await queryOne<{ count: string }>(
              "SELECT COUNT(*) as count FROM glm_transactions WHERE block_timestamp > $1",
              [pageTransactions[0].block_timestamp]
            );
            if (parseInt(newerCount?.count ?? "0", 10) > 0) {
              prevCursor = pageTransactions[0].block_timestamp;
            }
          }
        }
      }

      const response: TransactionsResponse = {
        transactions: pageTransactions,
        next_cursor: nextCursor,
        prev_cursor: prevCursor,
        total,
      };

      return response;
    }
  );
}

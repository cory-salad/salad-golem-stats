import fs from 'fs/promises';
import path from 'path';
import { DateTime } from 'luxon';
import { config } from './config.js';
import { logger } from './logger.js';

interface DateRange {
  filename: string;
  start: string;
  end: string;
}

/**
 * Build the JQL query script with optional org name filter.
 */
function buildJqlScript(date: string, orgNames: readonly string[]): string {
  const orgFilterClause =
    orgNames.length > 0
      ? `var allowedOrgs = ${JSON.stringify(orgNames)};`
      : '';

  const orgFilterCondition =
    orgNames.length > 0 ? ' && allowedOrgs.indexOf(e.properties.OrganizationName) !== -1' : '';

  return `
function main() {
  ${orgFilterClause}
  return Events({
    from_date: "${date}",
    to_date: "${date}",
    event_selectors: [{ event: "Workload Earning" }]
  })
  .filter(function(e) {
    return e.properties.InvoiceAmount > 0${orgFilterCondition};
  })
  .groupBy(
    [
      "properties.OrganizationName",
      "properties.ContainerGroupSlug",
      "properties.MachineId"
    ],
    [
      mixpanel.reducer.min("time"),
      mixpanel.reducer.max("time"),
      mixpanel.reducer.sum("properties.InvoiceAmount"),
      mixpanel.reducer.max("properties.WorkloadCpuLimit"),
      mixpanel.reducer.max("properties.WorkloadMemoryLimitMb"),
      function(accumulators, events) {
        var result = accumulators.find(function(x) { return typeof x === 'string'; });
        if (typeof result === 'string') {
          return result;
        }
        result = events.find(function(x) { return x !== null && x !== undefined && typeof x.properties.WorkloadGpuClassUuid === 'string'; });
        if (result === null || result === undefined) {
          return null;
        }
        return result.properties.WorkloadGpuClassUuid;
      }
    ]
  );
}
`;
}

/**
 * Get the previous n day ranges based on Mountain Time.
 */
function getPreviousDayRanges(n: number, baseDate?: Date): DateRange[] {
  const base = baseDate
    ? DateTime.fromJSDate(baseDate, { zone: 'America/Denver' })
    : DateTime.now().setZone('America/Denver');

  const pad = (x: number) => x.toString().padStart(2, '0');
  const formatCompact = (d: DateTime) => `${d.year}${pad(d.month)}${pad(d.day)}`;
  const formatDashed = (d: DateTime) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

  logger.info(`Base date for JQL fetch: ${base.toISO()}`);

  const result: DateRange[] = [];
  for (let i = n + 1; i >= 2; i--) {
    const start = base.minus({ days: i });
    const end = base.minus({ days: i - 1 });
    result.push({
      filename: `${formatCompact(start)}-${formatCompact(end)}.json`,
      start: formatDashed(start),
      end: formatDashed(end),
    });
  }
  return result;
}

/**
 * Fetch data from MixPanel JQL API for the previous two days.
 */
export async function fetchMixpanelJql(): Promise<void> {
  const ranges = getPreviousDayRanges(2);

  if (config.orgNameFilter.length > 0) {
    logger.info(`Org name filter active: ${config.orgNameFilter.join(', ')}`);
  }

  const importedDir = path.join(config.dataDirectory, 'imported');
  const pendingDir = path.join(config.dataDirectory, 'pending');

  await fs.mkdir(importedDir, { recursive: true });
  await fs.mkdir(pendingDir, { recursive: true });

  for (const { filename, start, end } of ranges) {
    // Skip if already imported
    const importedPath = path.join(importedDir, filename);
    try {
      await fs.access(importedPath);
      logger.info(`File ${filename} already exists in imported folder. Skipping.`);
      continue;
    } catch {
      logger.info(`File ${filename} does not exist in imported folder. Proceeding to fetch.`);
    }

    logger.info(`Fetching data for ${filename} from MixPanel JQL API...`);

    const jqlScript = buildJqlScript(end, config.orgNameFilter);

    const encodedParams = new URLSearchParams();
    encodedParams.set('script', jqlScript);

    const response = await fetch(config.mixpanel.jqlUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: 'Basic ' + Buffer.from(`${config.mixpanel.apiKey}:`).toString('base64'),
      },
      body: encodedParams,
    });

    if (!response.ok) {
      logger.error(`MixPanel API error for ${filename}: ${response.status} ${response.statusText}`);
      continue;
    }

    const data = await response.json();

    const pendingPath = path.join(pendingDir, filename);
    await fs.writeFile(pendingPath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info(`Saved ${filename} to pending folder.`);
  }
}

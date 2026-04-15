import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  PremiumLibraryCatalogReport,
  PremiumLibraryInspectionReport,
  PremiumLibraryAssetSummary,
  PremiumLibraryUsagePlan,
} from '@elementify/shared';
import type { ElementifyClient } from '../client.js';
import { buildCapabilityMatrix } from '../destination.js';
import { buildSiteFingerprint } from '../fingerprint.js';
import {
  buildPremiumLibraryImportInput,
  inspectPremiumLibraryAsset,
  buildPremiumLibraryUsagePlan,
  listPremiumLibraryAssets,
} from '../premium-library.js';

const PREMIUM_LIBRARY_COLLECTION_LABELS: Record<PremiumLibraryAssetSummary['collection'], string> = {
  conversion: 'Conversion systems',
  'service-pages': 'Service pages',
  'trust-components': 'Trust and proof',
  'theme-builder': 'Theme Builder structure',
};

const PREMIUM_LIBRARY_CURATION_LABELS: Record<PremiumLibraryAssetSummary['curationLevel'], string> = {
  signature: 'Signature',
  featured: 'Featured',
  specialist: 'Specialist',
};

const PREMIUM_LIBRARY_AUDIENCE_LABELS: Record<PremiumLibraryAssetSummary['audience'][number], string> = {
  freelancer: 'freelancer',
  agency: 'agency',
  'site-owner': 'site owner',
};

function renderAudiences(audience: PremiumLibraryAssetSummary['audience']): string {
  return audience.map((entry) => PREMIUM_LIBRARY_AUDIENCE_LABELS[entry]).join(', ');
}

function renderCollection(collection: PremiumLibraryAssetSummary['collection']): string {
  return PREMIUM_LIBRARY_COLLECTION_LABELS[collection];
}

function renderCurationLevel(level: PremiumLibraryAssetSummary['curationLevel']): string {
  return PREMIUM_LIBRARY_CURATION_LABELS[level];
}

function renderAssetListItem(asset: PremiumLibraryAssetSummary, index: number): string[] {
  return [
    `  ${index + 1}. ${asset.title} [${asset.type}] — ${asset.summary}`,
    `     Collection: ${renderCollection(asset.collection)}`,
    `     Curation: ${renderCurationLevel(asset.curationLevel)}`,
    `     Audience: ${renderAudiences(asset.audience)}`,
    `     Signals: ${asset.curationSignals.join(', ')}`,
    `     Use cases: ${asset.useCases.join(', ')}`,
  ];
}

function renderAssetList(report: PremiumLibraryCatalogReport): string[] {
  const groupedAssets = new Map<PremiumLibraryAssetSummary['collection'], PremiumLibraryAssetSummary[]>();

  for (const asset of report.assets) {
    const bucket = groupedAssets.get(asset.collection) ?? [];
    bucket.push(asset);
    groupedAssets.set(asset.collection, bucket);
  }

  const lines = [
    '## Catalog',
    ...Array.from(groupedAssets.entries()).flatMap(([collection, assets]) => [
      `### ${renderCollection(collection)}`,
      ...assets.flatMap((asset, index) => renderAssetListItem(asset, index)),
    ]),
  ];

  if (report.notes.length > 0) {
    lines.push('');
    lines.push('## Notes');
    lines.push(...report.notes.map((note) => `  - ${note}`));
  }

  return lines;
}

function renderAssetInspection(report: PremiumLibraryInspectionReport): string[] {
  const lines = [
    `Asset: ${report.asset.title}`,
    `Type: ${report.asset.type}`,
    `Collection: ${renderCollection(report.asset.collection)}`,
    `Curation: ${renderCurationLevel(report.asset.curationLevel)}`,
    `Audience: ${renderAudiences(report.asset.audience)}`,
    `Import mode: ${report.importMode}`,
    '',
    '## Summary',
    `  - ${report.asset.summary}`,
    `  - Intended use: ${report.asset.intendedUse}`,
    `  - Signals: ${report.asset.curationSignals.join(', ')}`,
    `  - Use cases: ${report.asset.useCases.join(', ')}`,
    '',
    '## Description',
    `  - ${report.asset.description}`,
    '',
    '## Local Import Notes',
    ...report.asset.localImportNotes.map((note) => `  - ${note}`),
    '',
    '## Prerequisites',
    ...report.asset.prerequisites.map((item) => `  - ${item}`),
    '',
    '## Guardrails',
    ...report.asset.guardrails.map((item) => `  - ${item}`),
    '',
    '## Workflow',
    ...report.recommendedWorkflow.map((step, index) => `  ${index + 1}. ${step}`),
  ];

  if (report.notes.length > 0) {
    lines.push('');
    lines.push('## Notes');
    lines.push(...report.notes.map((note) => `  - ${note}`));
  }

  return lines;
}

export function registerPremiumLibraryTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'list_premium_library_assets',
    'List curated Elementify Premium Library assets for the current site. This is an Advanced-only catalog inspection surface and stays local-site operational.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      target_type: z.enum(['page-starter', 'section-starter', 'component', 'theme-block']).optional()
        .describe('Optional asset shape to filter the catalog by'),
    },
    async ({ site_id, target_type }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const report = listPremiumLibraryAssets({
        targetType: target_type,
        assessment,
        context,
        capabilityMatrix,
      });

      const lines: string[] = [
        `Premium Library Catalog — ${assessment.wordpress.site_name}`,
        `Provider: ${report.provider}`,
        `Availability: ${report.availability}`,
        `Assets: ${report.assetCount}`,
        '',
        ...renderAssetList(report),
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  server.tool(
    'inspect_premium_library_asset',
    'Inspect a curated Elementify Premium Library asset before importing it locally. This is an Advanced-only inspection surface and does not imply cloud storage or Studio delivery semantics.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      asset_id: z.string().describe('Premium library asset identifier'),
    },
    async ({ site_id, asset_id }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const report = inspectPremiumLibraryAsset({
        assetId: asset_id,
        assessment,
        context,
        capabilityMatrix,
      });

      const lines: string[] = [
        `Premium Library Inspection — ${assessment.wordpress.site_name}`,
        `Provider: ${report.provider}`,
        `Availability: ${report.availability}`,
        '',
        ...renderAssetInspection(report),
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  server.tool(
    'plan_premium_library_usage',
    'Plan how a curated Elementify Premium Library asset should be used on the current site. This is an Advanced-only workflow surface: it explains how premium assets are imported into or used alongside the local Elementor Library without implying cloud sync or Studio delivery semantics.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      asset_id: z.string().optional().describe('Optional premium library asset identifier'),
      target_type: z.enum(['page-starter', 'section-starter', 'component', 'theme-block'])
        .optional()
        .default('section-starter')
        .describe('The premium asset shape you want to use on the current site'),
    },
    async ({ site_id, asset_id, target_type }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const plan = buildPremiumLibraryUsagePlan({
        assetId: asset_id,
        targetType: target_type,
        assessment,
        context,
        capabilityMatrix,
      });

      const lines: string[] = [
        `Premium Library Usage Plan — ${assessment.wordpress.site_name}`,
        `Target type: ${plan.targetType}`,
        `Active provider: ${plan.activeProvider}`,
        `Premium provider available: ${plan.premiumProviderAvailable ? 'yes' : 'no'}`,
        `Import mode: ${plan.importMode}`,
        plan.assetId ? `Selected asset id: ${plan.assetId}` : undefined,
        plan.assetTitle ? `Selected asset title: ${plan.assetTitle}` : undefined,
        '',
        '## Recommended Workflow',
        ...plan.recommendedWorkflow.map((step: PremiumLibraryUsagePlan['recommendedWorkflow'][number], index: number) => `  ${index + 1}. ${step}`),
      ].filter((line): line is string => line !== undefined);

      if (plan.prerequisites.length > 0) {
        lines.push('');
        lines.push('## Prerequisites');
        lines.push(...plan.prerequisites.map((item: PremiumLibraryUsagePlan['prerequisites'][number]) => `  - ${item}`));
      }

      if (plan.guardrails.length > 0) {
        lines.push('');
        lines.push('## Guardrails');
        lines.push(...plan.guardrails.map((item: PremiumLibraryUsagePlan['guardrails'][number]) => `  - ${item}`));
      }

      if (plan.notes.length > 0) {
        lines.push('');
        lines.push('## Notes');
        lines.push(...plan.notes.map((item: PremiumLibraryUsagePlan['notes'][number]) => `  - ${item}`));
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  server.tool(
    'import_premium_library_asset',
    'Import a curated Elementify Premium Library asset into the local Elementor Library on the current site. This is an Advanced-only execution seam that uses the dedicated local library/import endpoint and does not imply cloud sync or Studio delivery behavior.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      asset_id: z.string().describe('Premium library asset identifier'),
      template_title: z.string().optional().describe('Optional local Elementor Library title override'),
      status: z.enum(['draft', 'publish']).optional().default('draft')
        .describe('Local library status for the imported template'),
      categories: z.array(z.string()).optional()
        .describe('Optional local Elementor Library categories to set after import'),
      tags: z.array(z.string()).optional()
        .describe('Optional local Elementor Library tags to set after import'),
    },
    async ({ site_id, asset_id, template_title, status, categories, tags }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const inspection = inspectPremiumLibraryAsset({
        assetId: asset_id,
        assessment,
        context,
        capabilityMatrix,
      });
      const plan = buildPremiumLibraryUsagePlan({
        assetId: asset_id,
        targetType: inspection.asset.type,
        assessment,
        context,
        capabilityMatrix,
      });
      const imported = await client.importLibraryAsset(
        buildPremiumLibraryImportInput({
          assetId: asset_id,
          title: template_title,
          status,
          categories,
          tags,
        }),
      );

      const lines: string[] = [
        `Premium Library Import — ${assessment.wordpress.site_name}`,
        `Imported asset: ${inspection.asset.title}`,
        `Asset type: ${inspection.asset.type}`,
        `Import mode: ${imported.import_mode}`,
        `Local template id: ${imported.template.id}`,
        `Local template title: ${imported.template.title}`,
        imported.template.shortcode ? `Shortcode: ${imported.template.shortcode}` : undefined,
        '',
        '## What happened',
        `  1. Resolved the curated premium asset ${inspection.asset.title}.`,
        '  2. Imported it into the local Elementor Library using the dedicated library/import seam.',
        '  3. Preserved the premium source metadata on the local template for later inspection and governance.',
        '',
        '## Next Steps',
        ...plan.recommendedWorkflow.slice(1).map((step, index) => `  ${index + 1}. ${step}`),
      ].filter((line): line is string => line !== undefined);

      if (plan.prerequisites.length > 0) {
        lines.push('');
        lines.push('## Prerequisites');
        lines.push(...plan.prerequisites.map((item) => `  - ${item}`));
      }

      if (plan.guardrails.length > 0) {
        lines.push('');
        lines.push('## Guardrails');
        lines.push(...plan.guardrails.map((item) => `  - ${item}`));
      }

      if (inspection.notes.length > 0 || plan.notes.length > 0) {
        lines.push('');
        lines.push('## Notes');
        lines.push(...Array.from(new Set([...inspection.notes, ...plan.notes])).map((item) => `  - ${item}`));
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}

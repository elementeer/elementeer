import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

type AddonDetailed = {
  active: boolean;
  version: string | null;
  tier: string | null;
  plugin_name: string;
  plugin_slug: string;
  widgets: Array<{
    id: string;
    title: string;
    active: boolean;
  }>;
  post_types: Array<unknown>;
  capabilities: Array<string>;
  elementor_widget_types: Array<string>;
};

/**
 * Map widget titles to functional categories.
 */
function categorizeWidget(title: string, id: string): string {
  const lower = title.toLowerCase();
  const idLower = id.toLowerCase();

  if (lower.includes('pricing') || lower.includes('price') || idLower.includes('pricing')) {
    return 'Pricing Table';
  }
  if (lower.includes('carousel') || lower.includes('slider')) {
    return 'Carousel / Slider';
  }
  if (lower.includes('gallery') || lower.includes('image grid')) {
    return 'Gallery';
  }
  if (lower.includes('accordion') || lower.includes('toggle')) {
    return 'Accordion / Toggle';
  }
  if (lower.includes('tab') || lower.includes('tabs')) {
    return 'Tabs';
  }
  if (lower.includes('form') || lower.includes('contact')) {
    return 'Form';
  }
  if (lower.includes('button') || lower.includes('cta')) {
    return 'Button / CTA';
  }
  if (lower.includes('testimonial') || lower.includes('review')) {
    return 'Testimonial';
  }
  if (lower.includes('icon') || lower.includes('icon box')) {
    return 'Icon / Icon Box';
  }
  if (lower.includes('counter') || lower.includes('countdown')) {
    return 'Counter / Countdown';
  }
  if (lower.includes('progress') || lower.includes('bar')) {
    return 'Progress Bar';
  }
  if (lower.includes('team') || lower.includes('member')) {
    return 'Team Member';
  }
  if (lower.includes('heading') || lower.includes('title')) {
    return 'Heading / Title';
  }
  if (lower.includes('blog') || lower.includes('post grid')) {
    return 'Blog / Post Grid';
  }
  if (lower.includes('menu') || lower.includes('navigation')) {
    return 'Menu / Navigation';
  }
  if (lower.includes('map') || lower.includes('google map')) {
    return 'Map';
  }
  if (lower.includes('video') || lower.includes('player')) {
    return 'Video';
  }
  if (lower.includes('social') || lower.includes('share')) {
    return 'Social Media';
  }
  if (lower.includes('alert') || lower.includes('notice')) {
    return 'Alert / Notice';
  }
  if (lower.includes('divider') || lower.includes('separator')) {
    return 'Divider / Separator';
  }
  if (lower.includes('spacer') || lower.includes('space')) {
    return 'Spacer';
  }
  if (lower.includes('animation') || lower.includes('parallax')) {
    return 'Animation / Parallax';
  }
  return 'Other';
}

export function registerAddonEcosystemTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_addon_overlap (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_addon_overlap',
    'Identify redundant widgets across installed add‑ons and recommend consolidation.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const activeAddons = detailed.filter(addon => addon.active);

        if (activeAddons.length === 0) {
          return {
            content: [{
              type: 'text',
              text: '# Add‑on Overlap Analysis\n\nNo active add‑ons detected. Install and activate at least one Elementor add‑on to see overlap analysis.',
            }],
          };
        }

        // Collect all widgets across addons
        const allWidgets: Array<{
          addon: string;
          widget: { id: string; title: string; active: boolean };
          category: string;
        }> = [];

        for (const addon of activeAddons) {
          for (const widget of addon.widgets) {
            allWidgets.push({
              addon: addon.plugin_name,
              widget,
              category: categorizeWidget(widget.title, widget.id),
            });
          }
        }

        // Group by category
        const byCategory: Record<string, Array<typeof allWidgets[0]>> = {};
        for (const item of allWidgets) {
          const cat = item.category;
          if (!byCategory[cat]) {
            byCategory[cat] = [];
          }
          byCategory[cat].push(item);
        }

        // Identify categories with multiple addons
        const redundantCategories = Object.entries(byCategory)
          .filter(([_, items]) => {
            const uniqueAddons = new Set(items.map(i => i.addon));
            return uniqueAddons.size > 1;
          })
          .sort((a, b) => b[1].length - a[1].length);

        const lines = [
          '# Add‑on Overlap Analysis',
          `**Active add‑ons**: ${activeAddons.length}`,
          `**Total widgets**: ${allWidgets.length}`,
          '',
          '## Redundant Widget Categories',
        ];

        if (redundantCategories.length === 0) {
          lines.push('No redundant widget categories found across add‑ons.');
        } else {
          lines.push('The following widget categories are provided by multiple add‑ons:');
          lines.push('');
          for (const [category, items] of redundantCategories) {
            const addonCount = new Set(items.map(i => i.addon)).size;
            const widgetCount = items.length;
            lines.push(`### ${category}`);
            lines.push(`- **Add‑ons**: ${addonCount}`);
            lines.push(`- **Total widgets**: ${widgetCount}`);
            lines.push(`- **Widgets by add‑on**:`);
            const byAddon: Record<string, number> = {};
            for (const item of items) {
              byAddon[item.addon] = (byAddon[item.addon] || 0) + 1;
            }
            for (const [addonName, count] of Object.entries(byAddon)) {
              lines.push(`  - ${addonName}: ${count} widget${count !== 1 ? 's' : ''}`);
            }
            lines.push('');
          }

          lines.push('## Consolidation Recommendations');
          lines.push('');
          lines.push('1. **Review overlapping categories** – consider deactivating duplicate widgets in one add‑on.');
          lines.push('2. **Focus on the most feature‑rich add‑on** for each category.');
          lines.push('3. **Disable unused widgets** in each add‑on to improve performance.');
        }

        // Add unused widget detection per page (placeholder)
        lines.push('');
        lines.push('## Page‑Level Widget Usage');
        lines.push('*(Page‑level scanning not yet implemented – will show unused widgets per page)*');

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to analyze add‑on overlap: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // widget_census (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'widget_census',
    'Map all widget usage across the entire site, showing which add‑ons provide which widgets and where they are used.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      limit: z.number().min(1).max(200).default(50).describe('Maximum number of pages to scan'),
    },
    async ({ site_id, limit }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const activeAddons = detailed.filter(addon => addon.active);

        if (activeAddons.length === 0) {
          return {
            content: [{
              type: 'text',
              text: '# Widget Census\n\nNo active add‑ons detected. Install and activate at least one Elementor add‑on to see widget usage.',
            }],
          };
        }

        // TODO: scan pages for actual widget usage
        // For now, show widget inventory per addon
        const lines = [
          '# Widget Census',
          `**Active add‑ons**: ${activeAddons.length}`,
          `**Page scan limit**: ${limit} (page scanning not yet implemented)`,
          '',
          '## Widget Inventory by Add‑on',
        ];

        for (const addon of activeAddons) {
          const activeWidgets = addon.widgets.filter(w => w.active);
          const inactiveWidgets = addon.widgets.filter(w => !w.active);
          lines.push(`### ${addon.plugin_name} (${addon.tier ?? 'unknown tier'})`);
          lines.push(`- **Total widgets**: ${addon.widgets.length}`);
          lines.push(`- **Active widgets**: ${activeWidgets.length}`);
          lines.push(`- **Inactive widgets**: ${inactiveWidgets.length}`);
          if (activeWidgets.length > 0) {
            lines.push('  - ' + activeWidgets.map(w => `**${w.title}**`).join(', '));
          }
          lines.push('');
        }

        lines.push('## Page‑Level Usage');
        lines.push('*(Page scanning not yet implemented – will show which widgets appear on which pages)*');

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run widget census: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // addon_ecosystem_wizard (Advanced)
  // ------------------------------------------------------------------ //
  server.tool(
    'addon_ecosystem_wizard',
    'Holistic add‑on strategy recommendation based on your site needs and current add‑on inventory.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const detailed = await client.listActiveAddonsDetailed();
        const activeAddons = detailed.filter(addon => addon.active);

        const lines = [
          '# Add‑on Ecosystem Wizard',
          '',
        ];

        if (activeAddons.length === 0) {
          lines.push('## Current State');
          lines.push('No active Elementor add‑ons detected.');
          lines.push('');
          lines.push('## Recommendations');
          lines.push('1. **Start with Essential Addons** – popular free add‑on with a wide widget range.');
          lines.push('2. **Consider PowerPack** if you need WooCommerce widgets.');
          lines.push('3. **For dynamic content** (ACF, custom fields), look at Crocoblock Suite.');
          lines.push('4. **For e‑commerce** focus on ShopEngine or WooCommerce‑specific add‑ons.');
          lines.push('');
          lines.push('**Next step**: Use `detect_essential_addons` to see if Essential Addons is installed.');
        } else {
          lines.push('## Current Add‑on Stack');
          lines.push(`You have **${activeAddons.length}** active add‑on${activeAddons.length !== 1 ? 's' : ''}:`);
          lines.push('');
          for (const addon of activeAddons) {
            lines.push(`- **${addon.plugin_name}** (${addon.tier ?? 'unknown tier'}) – ${addon.widgets.length} widgets`);
          }
          lines.push('');

          // Detect overlap
          const widgetCategories = new Map<string, string[]>();
          for (const addon of activeAddons) {
            for (const widget of addon.widgets) {
              const cat = categorizeWidget(widget.title, widget.id);
              if (!widgetCategories.has(cat)) {
                widgetCategories.set(cat, []);
              }
              widgetCategories.get(cat)!.push(addon.plugin_name);
            }
          }

          const redundantCats = Array.from(widgetCategories.entries())
            .filter(([_, addons]) => addons.length > 1)
            .map(([cat, addons]) => ({ cat, addons: [...new Set(addons)] }));

          if (redundantCats.length > 0) {
            lines.push('## Overlap Alert');
            lines.push('The following widget categories are provided by multiple add‑ons:');
            lines.push('');
            for (const { cat, addons } of redundantCats) {
              lines.push(`- **${cat}**: ${addons.join(', ')}`);
            }
            lines.push('');
            lines.push('**Recommendation**: Consider deactivating duplicate widgets in one add‑on to reduce bloat.');
            lines.push('');
          }

          lines.push('## Strategic Recommendations');
          lines.push('');
          if (activeAddons.length === 1) {
            lines.push('You have a single add‑on – good for simplicity.');
            lines.push('**Consider expanding** if you need specific widgets missing in your current add‑on.');
          } else if (activeAddons.length >= 5) {
            lines.push('You have many add‑ons – be mindful of performance and potential conflicts.');
            lines.push('**Consider consolidating** overlapping widgets and removing unused add‑ons.');
          } else {
            lines.push('Your add‑on stack is balanced.');
            lines.push('**Ensure** each add‑on serves a unique purpose.');
          }

          lines.push('');
          lines.push('## Next Steps');
          lines.push('1. Run `analyze_addon_overlap` to see detailed redundancy.');
          lines.push('2. Use `widget_census` to see which widgets are actually used.');
          lines.push('3. Deactivate unused widgets in each add‑on’s settings.');
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `# Error\n\nFailed to run add‑on ecosystem wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}
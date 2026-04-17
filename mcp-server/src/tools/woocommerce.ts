import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerWooCommerceTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // list_products (WOO-001)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_products',
    'List WooCommerce products with pagination and filters (status, category, stock).',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(20).describe('Items per page (max 100)'),
      status: z.enum(['any', 'publish', 'draft', 'pending', 'private']).optional().default('any').describe('Product status filter'),
      category: z.string().optional().describe('Category slug or ID filter'),
      stock_status: z.enum(['any', 'instock', 'outofstock', 'onbackorder']).optional().default('any').describe('Stock status filter'),
      search: z.string().optional().describe('Search term'),
    },
    async ({ site_id, page, per_page, status, category, stock_status, search }) => {
      try {
        const client = getClient(site_id);
        const products = await client.listWooCommerceProducts({ page, per_page, status, category, stock_status, search });

        const lines: string[] = [
          '# WooCommerce Products',
          `**Total products**: ${products.total}`,
          `**Page**: ${products.page} of ${products.total_pages}`,
          `**Per page**: ${products.per_page}`,
        ];

        if (products.products.length === 0) {
          lines.push('\nNo products found.');
        } else {
          lines.push('\n## Products');
          lines.push('| ID | Name | SKU | Price | Stock | Type |');
          lines.push('|----|------|-----|-------|-------|------|');
          for (const product of products.products.slice(0, 20)) {
            const price = product.price ? `$${product.price}` : '—';
            const stock = product.stock_quantity !== undefined ? product.stock_quantity : product.stock_status;
            lines.push(`| ${product.id} | ${product.name.substring(0, 40)}${product.name.length > 40 ? '…' : ''} | ${product.sku || '—'} | ${price} | ${stock} | ${product.type} |`);
          }
          if (products.products.length > 20) {
            lines.push(`| … ${products.products.length - 20} more … |`);
          }
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
            text: `❌ Error listing products: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_product (WOO-002)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_product',
    'Retrieve full product data including variations, meta, images.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      product_id: z.number().describe('Product ID'),
    },
    async ({ site_id, product_id }) => {
      try {
        const client = getClient(site_id);
        const product = await client.getWooCommerceProduct(product_id);

        const lines: string[] = [
          `# Product: ${product.name}`,
          `**ID**: ${product.id}`,
          `**SKU**: ${product.sku || '—'}`,
          `**Type**: ${product.type}`,
          `**Status**: ${product.status}`,
          `**Price**: ${product.price ? `$${product.price}` : '—'}`,
          `**Regular price**: ${product.regular_price ? `$${product.regular_price}` : '—'}`,
          `**Sale price**: ${product.sale_price ? `$${product.sale_price}` : '—'}`,
          `**Stock status**: ${product.stock_status}`,
          `**Stock quantity**: ${product.stock_quantity ?? '—'}`,
          `**Weight**: ${product.weight || '—'}`,
          `**Dimensions**: ${product.dimensions ? `${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height} ${product.dimensions.unit}` : '—'}`,
        ];

        if (product.categories.length > 0) {
          lines.push(`**Categories**: ${product.categories.map((c: any) => c.name).join(', ')}`);
        }
        if (product.tags.length > 0) {
          lines.push(`**Tags**: ${product.tags.map((t: any) => t.name).join(', ')}`);
        }

        if (product.images.length > 0) {
          lines.push('\n## Images');
          for (const image of product.images.slice(0, 5)) {
            lines.push(`- ${image.name}: ${image.src}`);
          }
          if (product.images.length > 5) {
            lines.push(`- … ${product.images.length - 5} more`);
          }
        }

        if (product.type === 'variable' && product.variations) {
          lines.push('\n## Variations');
          lines.push('| ID | Attributes | Price | Stock |');
          lines.push('|----|------------|-------|-------|');
          for (const variation of product.variations.slice(0, 10)) {
            const attrs = variation.attributes.map((a: any) => `${a.name}: ${a.option}`).join(', ');
            lines.push(`| ${variation.id} | ${attrs} | ${variation.price ? `$${variation.price}` : '—'} | ${variation.stock_quantity ?? variation.stock_status} |`);
          }
          if (product.variations.length > 10) {
            lines.push(`| … ${product.variations.length - 10} more … |`);
          }
        }

        lines.push(`\n*View product in WordPress: ${product.permalink}*`);

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
            text: `❌ Error getting product: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // create_product (WOO-003)
  // ------------------------------------------------------------------ //
  server.tool(
    'create_product',
    'Create a new simple or variable product with taxonomy terms.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      name: z.string().describe('Product name'),
      type: z.enum(['simple', 'variable', 'grouped', 'external']).optional().default('simple').describe('Product type'),
      status: z.enum(['draft', 'publish', 'pending', 'private']).optional().default('draft').describe('Initial status'),
      regular_price: z.number().optional().describe('Regular price (numeric)'),
      sale_price: z.number().optional().describe('Sale price (numeric)'),
      description: z.string().optional().describe('Full HTML description'),
      short_description: z.string().optional().describe('Short excerpt'),
      sku: z.string().optional().describe('Stock Keeping Unit'),
      manage_stock: z.boolean().optional().default(false).describe('Enable stock management'),
      stock_quantity: z.number().optional().describe('Initial stock quantity'),
      categories: z.array(z.string()).optional().describe('Category slugs or IDs'),
      tags: z.array(z.string()).optional().describe('Tag slugs'),
      images: z.array(z.string()).optional().describe('Image URLs (first is featured)'),
    },
    async (args) => {
      try {
        const client = getClient(args.site_id);
        const product = await client.createWooCommerceProduct(args);

        const lines: string[] = [
          '# Product Created',
          `**ID**: ${product.id}`,
          `**Name**: ${product.name}`,
          `**Type**: ${product.type}`,
          `**Status**: ${product.status}`,
          `**SKU**: ${product.sku || '—'}`,
          `**Price**: ${product.price ? `$${product.price}` : '—'}`,
          `**Permalink**: ${product.permalink}`,
        ];

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
            text: `❌ Error creating product: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // update_product (WOO-004)
  // ------------------------------------------------------------------ //
  server.tool(
    'update_product',
    'Modify product price, stock, description, etc.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      product_id: z.number().describe('Product ID'),
      name: z.string().optional().describe('New product name'),
      regular_price: z.number().optional().describe('Regular price (numeric)'),
      sale_price: z.number().optional().describe('Sale price (numeric)'),
      description: z.string().optional().describe('Full HTML description'),
      short_description: z.string().optional().describe('Short excerpt'),
      sku: z.string().optional().describe('Stock Keeping Unit'),
      manage_stock: z.boolean().optional().describe('Enable stock management'),
      stock_quantity: z.number().optional().describe('Stock quantity'),
      stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).optional().describe('Stock status'),
      categories: z.array(z.string()).optional().describe('Category slugs or IDs'),
      tags: z.array(z.string()).optional().describe('Tag slugs'),
    },
    async (args) => {
      try {
        const client = getClient(args.site_id);
        const product = await client.updateWooCommerceProduct(args.product_id, args);

        const lines: string[] = [
          '# Product Updated',
          `**ID**: ${product.id}`,
          `**Name**: ${product.name}`,
          `**Price**: ${product.price ? `$${product.price}` : '—'}`,
          `**Stock status**: ${product.stock_status}`,
          `**Stock quantity**: ${product.stock_quantity ?? '—'}`,
          `**Permalink**: ${product.permalink}`,
        ];

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
            text: `❌ Error updating product: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // delete_product (WOO-005)
  // ------------------------------------------------------------------ //
  server.tool(
    'delete_product',
    'Move product to trash or permanently delete.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      product_id: z.number().describe('Product ID'),
      force: z.boolean().optional().default(false).describe('Permanently delete (skip trash)'),
    },
    async ({ site_id, product_id, force }) => {
      try {
        const client = getClient(site_id);
        await client.deleteWooCommerceProduct(product_id, force);

        return {
          content: [{
            type: 'text',
            text: `✅ Product ${product_id} ${force ? 'permanently deleted' : 'moved to trash'}.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error deleting product: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_orders (WOO-006)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_orders',
    'Browse WooCommerce orders with status filter.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(20).describe('Items per page (max 100)'),
      status: z.string().optional().describe('Order status filter (comma-separated)'),
      customer: z.number().optional().describe('Customer user ID filter'),
      product: z.number().optional().describe('Product ID filter'),
      date_after: z.string().optional().describe('Orders after date (YYYY-MM-DD)'),
      date_before: z.string().optional().describe('Orders before date (YYYY-MM-DD)'),
    },
    async ({ site_id, page, per_page, status, customer, product, date_after, date_before }) => {
      try {
        const client = getClient(site_id);
        const orders = await client.listWooCommerceOrders({ page, per_page, status, customer, product, date_after, date_before });

        const lines: string[] = [
          '# WooCommerce Orders',
          `**Total orders**: ${orders.total}`,
          `**Page**: ${orders.page} of ${orders.total_pages}`,
          `**Per page**: ${orders.per_page}`,
        ];

        if (orders.orders.length === 0) {
          lines.push('\nNo orders found.');
        } else {
          lines.push('\n## Orders');
          lines.push('| ID | Date | Status | Customer | Total |');
          lines.push('|----|------|--------|----------|-------|');
          for (const order of orders.orders.slice(0, 20)) {
            const date = new Date(order.date_created).toLocaleDateString();
            const customerName = order.billing?.first_name ? `${order.billing.first_name} ${order.billing.last_name}` : order.customer_id;
            lines.push(`| ${order.id} | ${date} | ${order.status} | ${customerName} | $${order.total} |`);
          }
          if (orders.orders.length > 20) {
            lines.push(`| … ${orders.orders.length - 20} more … |`);
          }
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
            text: `❌ Error listing orders: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_order (WOO-007)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_order',
    'Retrieve order details, line items, customer data.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      order_id: z.number().describe('Order ID'),
    },
    async ({ site_id, order_id }) => {
      try {
        const client = getClient(site_id);
        const order = await client.getWooCommerceOrder(order_id);

        const lines: string[] = [
          `# Order #${order.id}`,
          `**Date**: ${new Date(order.date_created).toLocaleString()}`,
          `**Status**: ${order.status}`,
          `**Total**: $${order.total}`,
          `**Payment method**: ${order.payment_method_title}`,
          `**Customer**: ${order.billing?.first_name} ${order.billing?.last_name} (${order.billing?.email})`,
          `**Shipping**: ${order.shipping?.address_1}, ${order.shipping?.city}, ${order.shipping?.state}`,
        ];

        if (order.line_items.length > 0) {
          lines.push('\n## Line Items');
          lines.push('| Product | Quantity | Price | Total |');
          lines.push('|---------|----------|-------|-------|');
          for (const item of order.line_items) {
            lines.push(`| ${item.name} | ${item.quantity} | $${item.price} | $${item.total} |`);
          }
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
            text: `❌ Error getting order: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // update_order_status (WOO-008)
  // ------------------------------------------------------------------ //
  server.tool(
    'update_order_status',
    'Change order status (processing, completed, cancelled, etc.).',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      order_id: z.number().describe('Order ID'),
      status: z.enum(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']).describe('New status'),
      note: z.string().optional().describe('Optional note to add to order'),
    },
    async ({ site_id, order_id, status, note }) => {
      try {
        const client = getClient(site_id);
        const order = await client.updateWooCommerceOrderStatus(order_id, status, note);

        return {
          content: [{
            type: 'text',
            text: `✅ Order #${order_id} status updated to "${status}".`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error updating order status: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_product_categories (WOO-009)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_product_categories',
    'List WooCommerce product categories (hierarchical).',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(50).describe('Items per page (max 100)'),
      parent: z.number().optional().describe('Parent category ID'),
    },
    async ({ site_id, page, per_page, parent }) => {
      try {
        const client = getClient(site_id);
        const categories = await client.listWooCommerceProductCategories({ page, per_page, parent });

        const lines: string[] = [
          '# Product Categories',
          `**Total categories**: ${categories.total}`,
        ];

        if (categories.categories.length === 0) {
          lines.push('\nNo categories found.');
        } else {
          lines.push('\n## Categories');
          lines.push('| ID | Name | Slug | Count | Parent |');
          lines.push('|----|------|------|-------|--------|');
          for (const cat of categories.categories.slice(0, 30)) {
            lines.push(`| ${cat.id} | ${cat.name} | ${cat.slug} | ${cat.count} | ${cat.parent || '—'} |`);
          }
          if (categories.categories.length > 30) {
            lines.push(`| … ${categories.categories.length - 30} more … |`);
          }
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
            text: `❌ Error listing product categories: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // manage_product_category (WOO-010)
  // ------------------------------------------------------------------ //
  server.tool(
    'manage_product_category',
    'Create, update, or delete a product category.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      id: z.number().optional().describe('Category ID (required for update/delete)'),
      name: z.string().optional().describe('Category name (required for create/update)'),
      slug: z.string().optional().describe('Category slug'),
      parent: z.number().optional().describe('Parent category ID'),
      description: z.string().optional().describe('Category description'),
    },
    async ({ site_id, action, id, name, slug, parent, description }) => {
      try {
        const client = getClient(site_id);
        let result;
        if (action === 'create') {
          result = await client.createWooCommerceProductCategory({ name, slug, parent, description });
        } else if (action === 'update') {
          if (!id) throw new Error('Category ID required for update');
          result = await client.updateWooCommerceProductCategory(id, { name, slug, parent, description });
        } else {
          if (!id) throw new Error('Category ID required for delete');
          await client.deleteWooCommerceProductCategory(id);
          result = { deleted: true };
        }

        const lines: string[] = [
          `# Category ${action}d`,
        ];
        if (action !== 'delete') {
          lines.push(`**ID**: ${result.id}`);
          lines.push(`**Name**: ${result.name}`);
          lines.push(`**Slug**: ${result.slug}`);
          lines.push(`**Parent**: ${result.parent || '—'}`);
        } else {
          lines.push(`Category ${id} deleted.`);
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
            text: `❌ Error managing product category: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_store_settings (WOO-011)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_store_settings',
    'Read WooCommerce settings (currency, dimensions, tax, etc.).',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const settings = await client.getWooCommerceStoreSettings();

        const lines: string[] = [
          '# WooCommerce Store Settings',
          `**Currency**: ${settings.currency}`,
          `**Currency position**: ${settings.currency_position}`,
          `**Thousand separator**: ${settings.thousand_separator}`,
          `**Decimal separator**: ${settings.decimal_separator}`,
          `**Number of decimals**: ${settings.number_of_decimals}`,
          `**Weight unit**: ${settings.weight_unit}`,
          `**Dimension unit**: ${settings.dimension_unit}`,
          `**Enable taxes**: ${settings.enable_taxes ? 'Yes' : 'No'}`,
          `**Tax based on**: ${settings.tax_based_on}`,
          `**Shipping calculation**: ${settings.shipping_calculation}`,
          `**Coupons enabled**: ${settings.coupons_enabled ? 'Yes' : 'No'}`,
        ];

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
            text: `❌ Error getting store settings: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // update_store_settings (WOO-012)
  // ------------------------------------------------------------------ //
  server.tool(
    'update_store_settings',
    'Modify store-level configuration.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      currency: z.string().optional().describe('Currency code (e.g., USD, EUR)'),
      currency_position: z.enum(['left', 'right', 'left_space', 'right_space']).optional().describe('Currency symbol position'),
      thousand_separator: z.string().optional().describe('Thousand separator character'),
      decimal_separator: z.string().optional().describe('Decimal separator character'),
      number_of_decimals: z.number().optional().describe('Number of decimal places'),
      weight_unit: z.string().optional().describe('Weight unit (kg, g, lbs, oz)'),
      dimension_unit: z.string().optional().describe('Dimension unit (cm, m, in, yd)'),
      enable_taxes: z.boolean().optional().describe('Enable tax calculation'),
      tax_based_on: z.string().optional().describe('Tax based on (shipping, billing)'),
      shipping_calculation: z.string().optional().describe('Shipping calculation method'),
      coupons_enabled: z.boolean().optional().describe('Enable coupon functionality'),
    },
    async (args) => {
      try {
        const client = getClient(args.site_id);
        const settings = await client.updateWooCommerceStoreSettings(args);

        const lines: string[] = [
          '# Store Settings Updated',
          `**Currency**: ${settings.currency}`,
          `**Currency position**: ${settings.currency_position}`,
          `**Weight unit**: ${settings.weight_unit}`,
          `**Dimension unit**: ${settings.dimension_unit}`,
          `**Enable taxes**: ${settings.enable_taxes ? 'Yes' : 'No'}`,
        ];

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
            text: `❌ Error updating store settings: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // setup_woocommerce_pages (WOO-013)
  // ------------------------------------------------------------------ //
  server.tool(
    'setup_woocommerce_pages',
    'Ensure shop, cart, checkout, my‑account pages exist (Elementor ready).',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      create_missing: z.boolean().optional().default(true).describe('Create missing pages'),
      assign_template: z.boolean().optional().default(true).describe('Assign Elementor template to new pages'),
    },
    async ({ site_id, create_missing, assign_template }) => {
      try {
        const client = getClient(site_id);
        const result = await client.setupWooCommercePages({ create_missing, assign_template });

        const lines: string[] = [
          '# WooCommerce Pages Setup',
        ];

        if (result.shop_page) {
          lines.push(`**Shop page**: ${result.shop_page.title} (ID: ${result.shop_page.id})`);
        }
        if (result.cart_page) {
          lines.push(`**Cart page**: ${result.cart_page.title} (ID: ${result.cart_page.id})`);
        }
        if (result.checkout_page) {
          lines.push(`**Checkout page**: ${result.checkout_page.title} (ID: ${result.checkout_page.id})`);
        }
        if (result.myaccount_page) {
          lines.push(`**My Account page**: ${result.myaccount_page.title} (ID: ${result.myaccount_page.id})`);
        }

        if (result.created_count > 0) {
          lines.push(`\n${result.created_count} page(s) created.`);
        }
        if (result.assigned_count > 0) {
          lines.push(`${result.assigned_count} page(s) assigned Elementor templates.`);
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
            text: `❌ Error setting up WooCommerce pages: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}
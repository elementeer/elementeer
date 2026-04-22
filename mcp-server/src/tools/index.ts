import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { registerLibraryTools } from './library.js';
import { registerTemplateManagementTools } from './template-management.js';
import { registerWorkflowStagingTools } from './workflow-staging.js';
import { registerIntelligenceCompositionTools } from './intelligence-composition.js';
import { registerPermissionsManagementTools } from './permissions-management.js';
import { registerContentTools } from './content.js';
import { registerAddonTools } from './addons.js';
import { registerEssentialAddonsFreeTools, registerEssentialAddonsAdvancedTools } from './essential-addons.js';
import { registerUltimateAddonsFreeTools, registerUltimateAddonsAdvancedTools } from './ultimate-addons.js';
import { registerCrocoblockFreeTools, registerCrocoblockAdvancedTools } from './crocoblock.js';
import { registerPowerPackFreeTools, registerPowerPackAdvancedTools } from './powerpack.js';
import { registerHappyAddonsFreeTools, registerHappyAddonsAdvancedTools } from './happy-addons.js';
import { registerElementsKitFreeTools, registerElementsKitAdvancedTools } from './elementskit.js';
import { registerPremiumAddonsFreeTools, registerPremiumAddonsAdvancedTools } from './premium-addons.js';
import { registerThePlusAddonsFreeTools, registerThePlusAddonsAdvancedTools } from './the-plus-addons.js';
import { registerAddonEcosystemTools } from './addon-ecosystem.js';
import { registerOrganizationTools } from './organization.js';
import { registerSiteTools } from './site.js';
import { registerPageTools } from './pages.js';
import { registerAssessmentTools } from './assessment.js';
import { registerRecommendationTools } from './recommendations.js';
import { registerAdvancedRecommendationTools } from './advanced-recommendations.js';
import { registerGlobalStylesTools } from './global-styles.js';
import {
  registerAdvancedWizardTools,
  registerFreeWizardTools,
} from './wizard.js';
import { registerStockImageTools } from './stock-images.js';
import { registerChangeQueueTools } from './change-queue.js';
import { registerEnvironmentTools } from './environment-tools.js';
import { registerFingerprintTools } from './fingerprint.js';
import { registerDestinationTools } from './destination.js';
import { registerValidationTools } from './validation.js';
import { registerDesignTokenTools } from './design-tokens.js';
import { registerAiPlanningTools } from './ai-planning.js';
import { registerControlPlaneTools } from './control-plane.js';
import { registerBrandAdaptationTools } from './brand-adaptation.js';
import { registerOutputCritiqueTools } from './output-critique.js';
import { registerPremiumLibraryTools } from './premium-library.js';
import { registerAdvancedWorkflowTools } from './advanced-workflows.js';
import { registerAdvancedMediaTools } from './advanced-media.js';
import { registerIntentWizardTools } from './intent-wizard.js';
import { registerFreeRuntimeWizardTools } from './free-runtime-wizards.js';
import { registerMenuTools } from './menus.js';
import { registerMediaTools } from './media.js';
import { registerSettingsTools } from './settings.js';
import { registerSeoTools } from './seo.js';
import { registerPerformanceFreeTools, registerPerformanceAdvancedTools } from './performance.js';
import { registerModuleWizards } from './wizards.js';
import { registerFormFreeTools, registerFormAdvancedTools } from './forms.js';
import { registerImportExportTools } from './import-export.js';
import { registerTranslationFreeTools, registerTranslationAdvancedTools } from './translation.js';
import { registerAllyTools } from './ally.js';
import { registerLmsTools } from './lms.js';
import { registerCharityTools } from './charity.js';
import { registerBookingTools, registerBookingAdvancedTools } from "./booking.js";
import { registerWooCommerceTools } from './woocommerce.js';

interface ToolRegistrationOptions {
  includeAdvanced?: boolean;
  includeStudioFuture?: boolean;
}

const FREE_TOOL_REGISTRARS = [
  registerLibraryTools,
  registerContentTools,
  registerOrganizationTools,
  registerSiteTools,
  registerAddonTools,
  registerEssentialAddonsFreeTools,
  registerUltimateAddonsFreeTools,
  registerCrocoblockFreeTools,
  registerPowerPackFreeTools,
  registerHappyAddonsFreeTools,
  registerElementsKitFreeTools,
  registerPremiumAddonsFreeTools,
  registerThePlusAddonsFreeTools,
  registerPageTools,
  registerMenuTools,
  registerMediaTools,
  registerSettingsTools,
  registerSeoTools,
  registerPerformanceFreeTools,
  registerAssessmentTools,
  registerRecommendationTools,
  registerIntentWizardTools,
  registerFreeRuntimeWizardTools,
  registerGlobalStylesTools,
  registerFormFreeTools,
  registerTranslationFreeTools,
  registerAllyTools,
  registerLmsTools,
  registerCharityTools,
  registerBookingTools,
  registerFreeWizardTools,
  registerFingerprintTools,
  registerDestinationTools,
  registerValidationTools,
  registerModuleWizards,
] as const;

const ADVANCED_TOOL_REGISTRARS = [
  registerStockImageTools,
  registerImportExportTools,
  registerAdvancedMediaTools,
  registerChangeQueueTools,
  registerEnvironmentTools,
  registerTemplateManagementTools,
  registerWorkflowStagingTools,
  registerIntelligenceCompositionTools,
  registerPermissionsManagementTools,
  registerDesignTokenTools,
  registerBrandAdaptationTools,
  registerAdvancedRecommendationTools,
  registerAiPlanningTools,
  registerOutputCritiqueTools,
  registerPremiumLibraryTools,
  registerAdvancedWorkflowTools,
  registerAdvancedWizardTools,
  registerPerformanceAdvancedTools,
  registerTranslationAdvancedTools,
  registerFormAdvancedTools,
  registerEssentialAddonsAdvancedTools,
  registerUltimateAddonsAdvancedTools,
  registerCrocoblockAdvancedTools,
  registerPowerPackAdvancedTools,
  registerHappyAddonsAdvancedTools,
  registerElementsKitAdvancedTools,
  registerPremiumAddonsAdvancedTools,
  registerThePlusAddonsAdvancedTools,
  registerAddonEcosystemTools,
  registerWooCommerceTools,
  registerBookingAdvancedTools,
] as const;

const STUDIO_FUTURE_TOOL_REGISTRARS = [
  registerControlPlaneTools,
] as const;

function registerToolSet(
  registrars: ReadonlyArray<
    (server: McpServer, getClient: (siteId?: string) => ElementifyClient) => void
  >,
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  for (const registerTools of registrars) {
    registerTools(server, getClient);
  }
}

export function registerFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerToolSet(FREE_TOOL_REGISTRARS, server, getClient);
}

export function registerAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerToolSet(ADVANCED_TOOL_REGISTRARS, server, getClient);
}

export function registerStudioFutureTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerToolSet(STUDIO_FUTURE_TOOL_REGISTRARS, server, getClient);
}

export function registerAllTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
  options: ToolRegistrationOptions = {},
): void {
  registerFreeTools(server, getClient);

  if (options.includeAdvanced ?? true) {
    registerAdvancedTools(server, getClient);
  }

  if (options.includeStudioFuture ?? true) {
    registerStudioFutureTools(server, getClient);
  }
}

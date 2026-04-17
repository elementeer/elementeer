# Project Knowledge Base
## Elementify MCP - Enhanced Agents Memory

### Architecture Patterns
#### WordPress Integration
- Use WordPress REST API for CRUD operations with proper authentication
- Plugin-side endpoints should validate capabilities and sanitize input
- MCP server tools map directly to plugin API endpoints

#### Tool Design
- Each tool should have a corresponding PHP endpoint in plugin/includes/Api/
- Tools must be registered in product-tiers.ts with appropriate governance level
- Batch operations should support progress reporting and filtering

#### Multi-Tier Product Strategy
- Free tier: Read-only and safe write operations
- Advanced tier: Automated writes with queuing (L2 governance)
- Studio tier: Full agentic control with consent-based approvals (L3)
- Mirror repository contains only Free tier tools for public distribution

### Code Conventions
#### TypeScript
- Use strict typing with proper interfaces for tool parameters
- Error handling with try/catch and meaningful error messages
- Consistent naming: snake_case for tool names, camelCase for variables

#### PHP (WordPress Plugin)
- Follow WordPress coding standards
- Use nonces and capability checks for security
- Sanitize and validate all user input

#### Testing
- Jest for unit tests of MCP server tools
- PHPUnit for plugin endpoint tests
- Integration tests verify end-to-end functionality

### Integration Knowledge
#### AI Services
- FaiGate integration for AI-powered features (translation, image generation)
- Fallback to free services (Pollinations.ai) when premium unavailable
- Context-aware prompts improve translation accuracy

#### Third-Party Plugins
- Detect active plugins (Yoast SEO, Rank Math, Elementor, etc.)
- Provide compatibility layers for different plugin versions
- Graceful degradation when plugins not installed

### Common Issues & Solutions
#### TypeScript Compilation Errors
- Problem: Orphaned blocks due to syntax errors
- Solution: Carefully review recent changes, use `npm run build` to verify
- Implementation: Run typecheck before committing changes

#### WordPress API Authentication
- Problem: Authentication failures due to expired tokens
- Solution: Implement token refresh mechanism
- Implementation: Check token validity before each request

#### Plugin Activation Conflicts
- Problem: Tools fail when required plugins not active
- Solution: Detect plugin status and provide clear error messages
- Implementation: Use `get_plugins()` to check activation status

### Agent-Specific Notes
#### Opencode
- Prefers explicit file paths and clear instructions
- Good with structured templates and existing patterns
- Needs clear success criteria for task completion
- Best for: Infrastructure, tool implementation, testing

#### Claude Code
- Strong with architectural decisions and planning
- Good at explaining trade-offs and documenting decisions
- Needs context management for large codebases
- Best for: Planning, complex logic, documentation

### Project-Specific Learnings
#### PRD v2/v3 Completion
- AI-powered batch translation improves WordPress multilingual site management
- Built-in accessibility scanner reduces dependency on third-party plugins
- Mirror export verification ensures clean separation between product tiers
- Batch export tools enable data portability and backup
- Cached assessment data improves wizard recommendation accuracy
- Booking integration readiness confirms ecosystem expansion capabilities

#### Governance Model Implementation
- L0 (Read): Safe for all users, no modifications
- L1 (Safe writes): Low-risk modifications (settings, meta data)
- L2 (Auto-queue): Higher-risk changes queued for review
- L3 (Consent): Requires explicit user approval before execution

#### Multi-Site Support
- Single MCP server can manage multiple WordPress sites
- Site switching requires re-authentication
- Configuration stored in ~/.elementify/config.json

### Next Phase: PRD v4
#### Plugin Ecosystem
- Allow third-party developers to extend Elementify MCP
- Plugin registry and discovery mechanism
- Version compatibility checking

#### Multi-Tenant Governance
- Agency-level control over multiple client sites
- Role-based access control (RBAC)
- Audit logging and compliance reporting

#### AI Agent Orchestration
- Coordinate multiple AI agents for complex workflows
- Task delegation and result aggregation
- Conflict resolution between agent actions

---

*Last Updated: 2026-04-17*
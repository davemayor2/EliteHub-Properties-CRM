/**
 * Automated Verification Script for Phase: UI Polish, Design System Consistency & Dashboard Refinement
 * Validates design tokens, CSS rules, component classes, button hierarchy, and alignment.
 */

import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

const rootDir = process.cwd();
const indexCssPath = path.join(rootDir, 'src', 'index.css');
const teamWorkspacePath = path.join(rootDir, 'components', 'staff', 'team', 'TeamWorkspace.tsx');
const dashboardPagePath = path.join(rootDir, 'app', 'staff', 'dashboard', 'page.tsx');
const overviewMetricGridPath = path.join(rootDir, 'components', 'staff', 'analytics', 'OverviewMetricGrid.tsx');
const needsAttentionWidgetPath = path.join(rootDir, 'components', 'staff', 'analytics', 'NeedsAttentionWidget.tsx');

console.log('\n--- 1. Validating Design System Tokens in src/index.css ---');
const indexCss = fs.readFileSync(indexCssPath, 'utf8');

assert(indexCss.includes('--space-1: 4px;'), 'Spacing token --space-1 defined');
assert(indexCss.includes('--space-2: 8px;'), 'Spacing token --space-2 defined');
assert(indexCss.includes('--space-4: 16px;'), 'Spacing token --space-4 defined');
assert(indexCss.includes('--space-6: 24px;'), 'Spacing token --space-6 defined');
assert(indexCss.includes('--radius-card: 12px;'), 'Radius token --radius-card (12px) defined');
assert(indexCss.includes('--radius-btn: 8px;'), 'Radius token --radius-btn (8px) defined');
assert(indexCss.includes('--radius-badge: 6px;'), 'Radius token --radius-badge (6px) defined');
assert(indexCss.includes('--shadow-subtle:'), 'Shadow token --shadow-subtle defined');
assert(indexCss.includes('--border-subtle:'), 'Border token --border-subtle defined');

console.log('\n--- 2. Validating Button System Hierarchy ---');
assert(indexCss.includes('.btn-primary {'), '.btn-primary base style defined');
assert(indexCss.includes('.btn-secondary {'), '.btn-secondary base style defined');
assert(indexCss.includes('.btn-danger {'), '.btn-danger base style defined');
assert(indexCss.includes('.btn-ghost {'), '.btn-ghost base style defined');
assert(indexCss.includes('.btn-add-staff'), '.btn-add-staff aligned with button system');

console.log('\n--- 3. Validating Card System & Breathing Room ---');
assert(indexCss.includes('.staff-section-card {'), '.staff-section-card defined');
assert(indexCss.includes('.section-card-header {'), '.section-card-header defined with standard padding');
assert(indexCss.includes('.section-card-body {'), '.section-card-body defined with standard padding');
assert(indexCss.includes('.section-card-title {'), '.section-card-title defined with 16px bold typography');

// Check nested card padding to prevent content touching outer borders
const distPadding = indexCss.match(/\.distribution-content\s*\{[^}]*padding:\s*([0-9]+px\s+[0-9]+px)/);
assert(distPadding && distPadding[1] === '20px 24px', '.distribution-content has 20px 24px internal padding');

const resPadding = indexCss.match(/\.resolution-metrics-grid\s*\{[^}]*padding:\s*([0-9]+px\s+[0-9]+px)/);
assert(resPadding && resPadding[1] === '20px 24px', '.resolution-metrics-grid has 20px 24px internal padding');

const workloadPadding = indexCss.match(/\.my-workload-grid\s*\{[^}]*padding:\s*([0-9]+px\s+[0-9]+px)/);
assert(workloadPadding && workloadPadding[1] === '20px 24px', '.my-workload-grid has 20px 24px internal padding');

const chartPadding = indexCss.match(/\.chart-canvas-wrapper\s*\{[^}]*padding:\s*([0-9]+px\s+[0-9]+px\s+[0-9]+px\s+[0-9]+px)/);
assert(chartPadding && chartPadding[1] === '16px 24px 20px 24px', '.chart-canvas-wrapper has 16px 24px 20px 24px padding');

console.log('\n--- 4. Validating Team Management Polish ---');
const teamWorkspace = fs.readFileSync(teamWorkspacePath, 'utf8');
assert(teamWorkspace.includes('team-metric-text-col'), 'TeamWorkspace separates metric number and label into text-col');
assert(teamWorkspace.includes('team-metric-value'), 'TeamWorkspace uses distinct team-metric-value');
assert(teamWorkspace.includes('team-metric-label'), 'TeamWorkspace uses distinct team-metric-label');
assert(teamWorkspace.includes('btn-primary') && teamWorkspace.includes('btn-add-staff'), 'Add Staff Member uses btn-primary styling');
assert(indexCss.includes('.team-search-input {') && indexCss.includes('padding: 10px 38px 10px 42px;'), 'Search field has 42px left padding preventing icon overlap');

console.log('\n--- 5. Validating Dashboard Header & Timeframe Alignment ---');
const dashboardPage = fs.readFileSync(dashboardPagePath, 'utf8');
assert(dashboardPage.includes('<DashboardHeader') && dashboardPage.includes('<DateRangeFilter'), 'DateRangeFilter is nested directly in DashboardHeader');
assert(indexCss.includes('.date-range-filter-wrapper {'), 'DateRangeFilter wrapper styled as SaaS segmented control');

console.log('\n--- 6. Validating Empty States & Metric Polish ---');
const needsAttention = fs.readFileSync(needsAttentionWidgetPath, 'utf8');
assert(needsAttention.includes('empty-state-banner'), 'NeedsAttentionWidget uses standardized compact empty-state-banner');

const overviewGrid = fs.readFileSync(overviewMetricGridPath, 'utf8');
assert(overviewGrid.includes('stat-card-icon-box') && overviewGrid.includes('size={18}'), 'Overview metric grid standardizes 18px icons in compact wrap');

console.log(`\n========================================`);
console.log(`Test Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

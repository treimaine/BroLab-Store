#!/usr/bin/env node

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

const VIEWPORTS = [
  { width: 360, height: 640, name: 'small-phone' },
  { width: 390, height: 844, name: 'iphone-12' },
  { width: 414, height: 896, name: 'large-phone' },
  { width: 768, height: 1024, name: 'tablet-portrait' },
  { width: 1024, height: 768, name: 'tablet-landscape' },
  { width: 1280, height: 720, name: 'small-laptop' },
  { width: 1440, height: 900, name: 'desktop' },
  { width: 1920, height: 1080, name: 'large-desktop' },
];

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/shop', name: 'shop' },
  { path: '/membership', name: 'membership' },
  { path: '/mixing-mastering', name: 'services' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/cart', name: 'cart' },
];

const BASE_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = path.join(process.cwd(), '__responsive__');

async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function captureResponsiveScreenshots() {
  console.log('🚀 Starting responsive design testing...');
  
  await ensureDirectory(SCREENSHOT_DIR);
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    for (const viewport of VIEWPORTS) {
      console.log(`📱 Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.width <= 414 ? 2 : 1, // Simulate retina for mobile
      });
      
      const page = await context.newPage();
      
      // Set dark theme preference
      await page.emulateMedia({ colorScheme: 'dark' });
      
      for (const route of ROUTES) {
        try {
          console.log(`  📸 Capturing ${route.name} at ${viewport.name}`);
          
          await page.goto(`${BASE_URL}${route.path}`, { 
            waitUntil: 'networkidle',
            timeout: 10000 
          });
          
          // Wait for any lazy loading or animations
          await page.waitForTimeout(2000);
          
          // Hide any loading states
          await page.evaluate(() => {
            const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
            skeletons.forEach(el => el.style.display = 'none');
          });
          
          const filename = `${route.name}-${viewport.name}.png`;
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, filename),
            fullPage: true,
            type: 'png',
          });
          
        } catch (error) {
          console.warn(`  ⚠️  Failed to capture ${route.name} at ${viewport.name}: ${error.message}`);
        }
      }
      
      await context.close();
    }
    
    console.log('✅ Responsive testing complete!');
    console.log(`📂 Screenshots saved in: ${SCREENSHOT_DIR}`);
    
  } catch (error) {
    console.error('❌ Error during responsive testing:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  captureResponsiveScreenshots().catch(console.error);
}

export { captureResponsiveScreenshots };
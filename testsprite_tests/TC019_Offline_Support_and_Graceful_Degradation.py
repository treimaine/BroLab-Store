import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Offline').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=No Limits').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Unlimited Downloads').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Save 20%').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=20% Merch Discount').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Be First').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Early Access').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=All Access').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Premium Licenses').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Exclusive').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Producer Network').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=VIP Support').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Priority Support').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    
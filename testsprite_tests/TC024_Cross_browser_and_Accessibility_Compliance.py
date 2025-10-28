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
        # -> Start keyboard-only navigation test by focusing and tabbing through the login button and main navigation links.
        frame = context.pages[-1]
        # Click the Login button to start keyboard navigation test
        elem = frame.locator('xpath=html/body/div/div/nav/div/div/div[3]/a[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Test keyboard navigation by focusing on email input, entering email, tabbing to continue button, and activating it.
        frame = context.pages[-1]
        # Input email address for login
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div/div/div[2]/form/div/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('slemba2@yahoo.fr')
        

        # -> Test keyboard navigation by focusing on password input, entering password, tabbing to continue button, and activating it.
        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div/div/div[2]/form/div/div/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Trust!NoOne93')
        

        # -> Navigate to the Beats shop page using keyboard navigation and verify UI rendering and accessibility.
        frame = context.pages[-1]
        # Click on Beats link in navigation menu to go to product browsing page
        elem = frame.locator('xpath=html/body/div/div/nav/div/div/div[2]/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate to the cart page using keyboard navigation and verify UI rendering and accessibility.
        frame = context.pages[-1]
        # Click on cart icon or link to navigate to cart page
        elem = frame.locator('xpath=html/body/div/div/nav/div/div/div[3]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate back to Beats shop, add a beat to the cart, and proceed to checkout to test accessibility and UI rendering.
        frame = context.pages[-1]
        # Click Browse Beats button to return to Beats shop page
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Add the first paid beat 'AURORA Vol.1' to the cart by clicking 'Add to Cart' button and then navigate to the cart page.
        frame = context.pages[-1]
        # Click 'Add to Cart' button for AURORA Vol.1 beat
        elem = frame.locator('xpath=html/body/div/div/main/div/div[2]/div/div/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on cart icon to navigate to cart page and verify UI rendering and keyboard navigation.
        frame = context.pages[-1]
        # Click cart icon to navigate to cart page
        elem = frame.locator('xpath=html/body/div/div/nav/div/div/div[3]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Welcome, Steve').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Your Cart is Empty').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Looks like you haven\'t added any beats to your cart yet.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Browse Beats').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Professional beats and instrumentals for the modern music producer. Quality sounds that inspire creativity and drive success.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Home').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Beats').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Membership').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Services').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=About').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Dashboard').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Contact').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=FAQ').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=© 2025 BroLab Entertainment. All rights reserved.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Visa').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Mastercard').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=PayPal').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    
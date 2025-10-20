import asyncio
from playwright import async_api

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
        # Click on the 'Services' link to navigate to the service booking page.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/section[2]/div/div[2]/div[2]/div/div[2]/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Close the newsletter popup to continue navigation.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Click on the 'Services' link in the navigation bar to go to the service booking page.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/nav/div/div/div[2]/a[4]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Fill out the booking form with valid inputs including full name, email, phone number, preferred date and time, number of tracks, genre, project details, and submit the form.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Test User')
        

        # Fill Email field with valid email address.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('testuser@example.com')
        

        # Fill Phone Number field with a valid phone number.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123-456-7890')
        

        # Fill Preferred Date field with a valid date.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[4]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2025-08-25')
        

        # Select a valid Preferred Time from the dropdown.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[5]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Select a valid Preferred Time from the dropdown options.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Fill Number of Tracks field with a valid number.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[6]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('3')
        

        # Select a valid Genre from the dropdown.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[7]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Select 'Hip Hop' genre from the dropdown options.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div[3]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Fill the Project Details text area with relevant project information.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div[2]/textarea').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('This is a test project for mixing and mastering services. Please ensure high quality and attention to detail.')
        

        # Click the 'Reserve Session' button to submit the booking form and verify confirmation.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div[5]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Assert that the booking confirmation message is visible after form submission.
        confirmation_message = frame.locator('text=Thank you for your booking')
        assert await confirmation_message.is_visible(), 'Booking confirmation message should be visible'
          
        # Assert that validation errors are displayed when submitting form with missing required fields.
        # Clear required fields to simulate invalid submission
        await frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div/div/input').fill('')  # Clear Full Name
        await frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[2]/div/input').fill('')  # Clear Email
        await frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[4]/input').fill('')  # Clear Preferred Date
        await frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div/div[5]/button').click()  # Open Preferred Time dropdown
        await frame.locator('xpath=html/body/div[3]/div/div/div').click()  # Select no time to simulate invalid
        await frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div[2]/form/div[5]/button').click()  # Attempt to submit form again
        await page.wait_for_timeout(2000)
        validation_errors = frame.locator('text=This field is required')
        assert await validation_errors.count() > 0, 'Validation errors should be displayed for required fields'
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    
from playwright.sync_api import sync_playwright
import pathlib

url = pathlib.Path(r"C:\mundo-social\index.html").resolve().as_uri()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto(url)
    page.wait_for_load_state("networkidle")

    page.screenshot(path="C:/mundo-social/mobile_before.png")

    toggle = page.locator(".nav-toggle")
    print("toggle visible:", toggle.is_visible())
    toggle.click()
    page.wait_for_timeout(300)
    page.screenshot(path="C:/mundo-social/mobile_open.png")

    menu = page.locator("#nav-menu")
    print("menu open class:", menu.evaluate("el => el.className"))
    print("aria-expanded:", toggle.get_attribute("aria-expanded"))

    links = page.locator(".nav-link").all_text_contents()
    print("links:", links)

    # click a link and check menu closes
    page.locator(".nav-link", has_text="Manifiesto").click()
    page.wait_for_timeout(300)
    print("aria-expanded after click:", toggle.get_attribute("aria-expanded"))

    browser.close()

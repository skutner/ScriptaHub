async (page) => {
    const origin = await page.evaluate(() => location.origin);
    const results = [];
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const control = async (command = {}) => (await page.request.post(`${origin}/fixture/control`, { data: command })).json();
    const session = () => page.evaluate(() => Boolean(sessionStorage.getItem('scriptahub:account:v1')));
    async function reset(path = '/') {
        for (const extra of page.context().pages()) if (extra !== page) await extra.close();
        await control({ coop: false, transports: {}, state: { roles: ['selfRegistered'], tokenClaims: {}, tokenError: null, userinfoError: null, badSignature: false } });
        await page.goto(origin);
        await page.evaluate(() => sessionStorage.removeItem('scriptahub:account:v1'));
        await page.goto(`${origin}${path}`);
        await page.waitForFunction(() => Boolean(window.ScriptaHubAuth));
    }
    async function popupAfter(effect) {
        const opened = page.context().waitForEvent('page');
        await effect();
        const popup = await opened;
        await popup.getByRole('link', { name: 'Complete fixture sign in' }).waitFor();
        return popup;
    }
    async function run(name, work) { try { await work(); } catch (error) { throw new Error(`${name}: ${error.message}; completed=${results.length}`); } results.push(name); }
    await run('Cancel during configuration fetch settles before late metadata', async () => {
        await reset();
        let release;
        let reached;
        const held = new Promise((resolve) => { reached = resolve; });
        await page.route('**/auth/config.json', async (route) => {
            reached();
            await new Promise((resolve) => { release = resolve; });
            await route.continue().catch(() => {});
        });
        await page.reload();
        await held;
        await page.locator('#pdf').click();
        await page.locator('.scriptahub-auth-pending button').click();
        await page.locator('.scriptahub-auth-pending').waitFor({ state: 'detached' });
        release();
        await page.unroute('**/auth/config.json');
        assert(!await session(), 'Cancelled configuration published');
        assert((await control()).holds.discovery === undefined, 'Unexpected discovery hold');
    });
    await run('popup blocker receives a fresh-gesture Continue and original Cancel', async () => {
        await reset();
        await page.evaluate(() => {
            const open = window.open;
            let block = true;
            window.open = (...args) => { if (block) { block = false; return null; } return open(...args); };
        });
        await page.locator('#pdf').click();
        const popup = await popupAfter(() => page.getByRole('button', { name: 'Continue', exact: true }).click());
        await popup.getByRole('link', { name: 'Complete fixture sign in' }).click();
        await page.waitForURL(`${origin}/requested.pdf?edition=current`);
        assert(await session(), 'Blocker fallback did not publish');
    });
    await run('feedback keeps an edited draft and agreement after original-tab Cancel', async () => {
        await reset('/feedback/index.html?book=fixture');
        await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('Fixture reader');
        await page.getByRole('textbox', { name: 'Reply email', exact: true }).fill('reader@example.test');
        await page.getByRole('textbox', { name: 'Your proposed change or feedback' }).fill('Original draft');
        await page.getByRole('checkbox').check();
        const popup = await popupAfter(() => page.getByRole('button', { name: 'Send feedback' }).click());
        await page.getByRole('textbox', { name: 'Your proposed change or feedback' }).fill('Edited while signing in');
        await page.locator('.scriptahub-auth-pending button').click();
        await page.getByRole('button', { name: 'Send feedback' }).waitFor({ state: 'visible' });
        assert(await page.getByRole('button', { name: 'Send feedback' }).isEnabled(), 'Feedback cannot retry');
        assert(await page.getByRole('textbox', { name: 'Your proposed change or feedback' }).inputValue() === 'Edited while signing in', 'Feedback draft lost');
        assert(await page.getByRole('checkbox').isChecked(), 'Agreement lost');
        assert(!await session(), 'Cancelled feedback published');
    });
    await run('withdrawn feedback agreement cancels a verified candidate without handoff', async () => {
        await reset('/feedback/index.html?book=fixture');
        await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('Fixture reader');
        await page.getByRole('textbox', { name: 'Reply email', exact: true }).fill('reader@example.test');
        await page.getByRole('textbox', { name: 'Your proposed change or feedback' }).fill('Preserved draft');
        await page.getByRole('checkbox').check();
        const popup = await popupAfter(() => page.getByRole('button', { name: 'Send feedback' }).click());
        await page.getByRole('checkbox').uncheck();
        await popup.getByRole('link', { name: 'Complete fixture sign in' }).click();
        await page.locator('.scriptahub-auth-pending').waitFor({ state: 'detached' });
        assert(!await session(), 'Withdrawn agreement published a candidate');
        assert(await page.locator('[data-workflow-status]').textContent() === '', 'Unexpected feedback handoff');
    });
    await run('whole-attempt deadline invalidates ready Continue in a real browser', async () => {
        await reset();
        await page.clock.install();
        const popup = await popupAfter(() => page.locator('#history').click());
        await popup.getByRole('link', { name: 'Complete fixture sign in' }).click();
        const continuation = page.getByRole('link', { name: 'Continue', exact: true });
        await continuation.waitFor();
        const retained = await continuation.elementHandle();
        await page.clock.fastForward(300001);
        await page.getByText('Sign in timed out. Please try again.').waitFor();
        assert(!await session(), 'Expired Continue published');
        const accepted = await retained.evaluate((node) => node.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })));
        assert(!accepted, 'Expired Continue accepted activation');
    });
    return { browser: await page.context().browser().version(), passed: results.length, cases: results };
}

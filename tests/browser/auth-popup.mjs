async (page) => {
    const origin = await page.evaluate(() => location.origin);
    const results = [];
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const control = async (command = {}) => (await page.request.post(`${origin}/fixture/control`, { data: command })).json();
    const session = () => page.evaluate(() => Boolean(sessionStorage.getItem('scriptahub:account:v1')));
    async function reset({ coop = false, transports = {} } = {}, path = '/') {
        for (const extra of page.context().pages()) if (extra !== page) await extra.close();
        await control({ coop, transports, state: { roles: ['selfRegistered'], tokenClaims: {}, tokenError: null, userinfoError: null, badSignature: false } });
        await page.goto(origin);
        await page.evaluate(() => sessionStorage.removeItem('scriptahub:account:v1'));
        await page.goto(`${origin}${path}`);
        await page.waitForFunction(() => Boolean(window.ScriptaHubAuth));
    }
    async function start(selector = '#pdf', root = page) {
        const popupPromise = page.context().waitForEvent('page');
        await root.locator(selector).click();
        const popup = await popupPromise;
        await popup.getByRole('link', { name: 'Complete fixture sign in' }).waitFor();
        return popup;
    }
    async function approve(popup) {
        await popup.getByRole('link', { name: 'Complete fixture sign in' }).click();
    }
    async function run(name, work) {
        try { await work(); } catch (error) { throw new Error(`${name}: ${error.message}; completed=${results.length}`); }
        results.push(name);
    }
    for (const options of [
        { name: 'normal strict popup', coop: false },
        { name: 'forced COOP missing opener', coop: true },
        { name: 'BroadcastChannel absent both peers', transports: { original: 'absent', callback: 'absent' } },
        { name: 'BroadcastChannel throws both peers', transports: { original: 'throw', callback: 'throw' } },
        { name: 'original channel throws', transports: { original: 'throw' } },
        { name: 'callback channel throws', transports: { callback: 'throw' } },
    ]) {
        await run(options.name, async () => {
            await reset(options);
            const before = await control();
            const popup = await start();
            if (options.coop) assert(await popup.evaluate(() => window.opener === null), 'COOP did not sever opener');
            assert(!await session(), 'Session published before callback');
            await approve(popup);
            await page.waitForURL(`${origin}/requested.pdf?edition=current`);
            assert(await session(), 'No published session');
            const after = await control();
            assert(after.counts.token === before.counts.token + 1, 'Duplicate code exchange');
            assert(after.counts.actions === before.counts.actions + 1, 'Wrong action count');
        });
    }
    await run('historical Continue publishes once from a trusted activation', async () => {
        await reset({ coop: true });
        const popup = await start('#history');
        await approve(popup);
        await page.getByRole('link', { name: 'Continue', exact: true }).waitFor();
        assert(!await session(), 'Candidate session escaped before Continue');
        const destination = page.waitForEvent('popup');
        await page.getByRole('link', { name: 'Continue', exact: true }).click();
        const target = await destination;
        await target.waitForURL(`${origin}/historical.pdf?edition=old`);
        assert(page.url() === `${origin}/`, 'Original tab navigated');
        assert(await session(), 'Continue did not publish');
    });
    await run('stale Continue click and auxclick after Cancel cannot navigate', async () => {
        await reset();
        const popup = await start('#history');
        await approve(popup);
        const continuation = page.getByRole('link', { name: 'Continue', exact: true });
        await continuation.waitFor();
        const retained = await continuation.elementHandle();
        const before = await control();
        await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
        for (const type of ['click', 'auxclick']) {
            const accepted = await retained.evaluate((node, type) => node.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: type === 'auxclick' ? 1 : 0 })), type);
            assert(!accepted, 'Stale activation was not cancelled');
        }
        assert(!await session(), 'Cancelled Continue published a session');
        assert((await control()).counts.actions === before.counts.actions, 'Stale Continue reached destination');
    });
    for (const stage of ['discovery', 'token', 'userinfo', 'jwks']) {
        await run(`Cancel while ${stage} is held; retry before old response`, async () => {
            await reset();
            await control({ hold: stage });
            const popupPromise = page.context().waitForEvent('page');
            await page.locator('#pdf').click();
            const popup = await popupPromise;
            if (stage !== 'discovery') {
                await popup.getByRole('link', { name: 'Complete fixture sign in' }).waitFor();
                await approve(popup);
            }
            await page.waitForFunction(async (origin) => (await (await fetch(`${origin}/fixture/control`)).json()).holds[Object.keys((await (await fetch(`${origin}/fixture/control`)).json()).holds)[0]], origin);
            await page.locator('.scriptahub-auth-pending button').click();
            await page.locator('.scriptahub-auth-pending').waitFor({ state: 'detached' });
            assert(!await session(), 'Cancelled network stage published');
            if (stage === 'discovery') await control({ release: stage });
            const retry = await start();
            await approve(retry);
            await page.waitForURL(`${origin}/requested.pdf?edition=current`);
            const saved = await session();
            await control({ release: stage });
            assert(saved && await session(), 'Old response cleared retry session');
        });
    }
    await run('physically closed popup retains original-tab cancellation', async () => {
        await reset();
        const popup = await start();
        await popup.close();
        await page.locator('.scriptahub-auth-pending button').click();
        await page.locator('.scriptahub-auth-pending').waitFor({ state: 'detached' });
        assert(!await session(), 'Closed popup published a session');
    });
    await run('lost opener and unavailable channels fail closed with retry guidance', async () => {
        await reset({ coop: true, transports: { original: 'absent', callback: 'throw' } });
        const popup = await start();
        await approve(popup);
        await popup.getByText('Return to ScriptaHub and start sign in again.').waitFor();
        assert(!await session(), 'Transport failure published a session');
        await page.locator('.scriptahub-auth-pending button').click();
        await page.locator('.scriptahub-auth-pending').waitFor({ state: 'detached' });
    });
    await run('same-origin reader frame publishes only its captured PDF action', async () => {
        await reset({}, '/?frame');
        const frame = page.frameLocator('iframe');
        await frame.locator('#pdf').waitFor();
        const popup = await start('#pdf', frame);
        await approve(popup);
        await frame.getByRole('heading', { name: 'Exact PDF action reached' }).waitFor();
        assert(await page.evaluate(() => location.pathname === '/'), 'Parent frame navigated');
        assert(await session(), 'Parent did not publish its delegated session');
    });
    await run('blocked current membership refuses action', async () => {
        await reset();
        await control({ state: { roles: ['blocked'] } });
        const before = await control();
        const popup = await start();
        await approve(popup);
        await page.getByText('This account cannot use this action.').waitFor();
        assert(!await session(), 'Blocked account stored a session');
        assert((await control()).counts.actions === before.counts.actions, 'Blocked account reached action');
    });
    await run('Suggest An Edit resumes the exact book feedback form', async () => {
        await reset({ coop: true });
        const popup = await start('#feedback');
        await approve(popup);
        await page.waitForURL(`${origin}/feedback/index.html?book=fixture`);
        await page.getByRole('heading', { name: 'Suggest a valuable change.' }).waitFor();
        assert(await session(), 'Feedback navigation did not publish');
    });
    const mac = await page.evaluate(() => navigator.platform.startsWith('Mac'));
    for (const options of [{ button: 'middle' }, { modifiers: [mac ? 'Meta' : 'Control'] }, { modifiers: ['Shift'] }]) {
        await run(`modified PDF activation ${JSON.stringify(options)} requires valid Continue`, async () => {
            await reset();
            const opened = page.context().waitForEvent('page');
            await page.locator('#pdf').click(options);
            const popup = await opened;
            await popup.getByRole('link', { name: 'Complete fixture sign in' }).waitFor();
            await approve(popup);
            await page.getByRole('link', { name: 'Continue', exact: true }).waitFor();
            assert(!await session(), 'Modified action published before Continue');
            const destination = page.waitForEvent('popup');
            await page.getByRole('link', { name: 'Continue', exact: true }).click();
            const target = await destination;
            await target.waitForURL(`${origin}/requested.pdf?edition=current`);
            assert(await session(), 'Modified action failed publication');
        });
    }
    if (mac) await run('macOS Control-click preserves the native context-menu path', async () => {
        await reset();
        await page.locator('#pdf').click({ modifiers: ['Control'] });
        assert(!await session(), 'Context-menu activation published a session');
        assert(page.context().pages().length === 1, 'Context-menu activation opened authentication');
        await page.keyboard.press('Escape');
    });
    await run('public reading and direct PDF URL remain available', async () => {
        await reset();
        const before = await control();
        await page.getByRole('link', { name: 'Read publicly' }).click();
        await page.getByRole('heading', { name: 'Public reading' }).waitFor();
        await page.goto(`${origin}/requested.pdf`);
        await page.getByRole('heading', { name: 'Exact PDF action reached' }).waitFor();
        assert((await control()).counts.discovery === before.counts.discovery, 'Public reading contacted issuer');
    });
    return { browser: await page.context().browser().version(), passed: results.length, cases: results };
}

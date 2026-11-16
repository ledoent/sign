/** @odoo-module **/
/* global document */

import {expect, getFixture, test} from "@odoo/hoot";
import {animationFrame} from "@odoo/hoot-mock";
import {makeTestApp} from "@web/../tests/web_test_helpers";
import {defineMailModels} from "@mail/../tests/mail_test_helpers";
import {SignOcaPdfPortal} from "@sign_oca/components/sign_oca_pdf_portal/sign_oca_pdf_portal.esm";

test("rebuilding the PDF navigator does not stack click handlers", async () => {
    defineMailModels();
    await makeTestApp();
    const fixture = getFixture();
    fixture.innerHTML = `
        <div id="viewerContainer">
            <div id="viewer"><div data-field="1"><div>Signature</div></div></div>
            <div class="o_sign_sign_item_navigator"></div>
            <div class="o_sign_sign_item_navline"></div>
        </div>`;
    const field = fixture.querySelector("[data-field]");
    field.firstElementChild.addEventListener("click", () => expect.step("open"));
    const parent = {
        iframe: () => ({contentDocument: document}),
        ui: {isSmall: true},
        checkSignItemsCompletion: () => [{el: field, data: {page: 1}}],
    };
    const navigate = SignOcaPdfPortal.prototype.navigate.bind(parent);
    navigate();
    const previous = parent.navigator;
    navigate();
    fixture.querySelector(".o_sign_sign_item_navigator").click();
    await animationFrame();
    expect(previous.state.destroyed).toBe(true);
    expect.verifySteps(["open"]);
    parent.navigator.destroy();
    fixture.querySelector(".o_sign_sign_item_navigator").click();
    await animationFrame();
    expect.verifySteps([]);
});

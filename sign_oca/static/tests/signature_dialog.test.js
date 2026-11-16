/** @odoo-module **/
/* global $, Event, document */

import {beforeEach, expect, test} from "@odoo/hoot";
import {
    assignDialogTestEnv,
    contains,
    makeTestApp,
    mountWithCleanup,
    onRpc,
    patchWithCleanup,
} from "@web/../tests/web_test_helpers";
import {
    SignOcaNameAndSignature,
    SignOcaSignatureDialog,
} from "@sign_oca/components/signature_dialog/signature_dialog.esm";
import {registry} from "@web/core/registry";
import {defineMailModels} from "@mail/../tests/mail_test_helpers";
import "@sign_oca/elements/signature.esm";

beforeEach(async () => {
    defineMailModels();
    patchWithCleanup(SignOcaNameAndSignature, {fontsPromise: undefined});
    assignDialogTestEnv();
    await makeTestApp();
});

async function mountSignature() {
    return mountWithCleanup(SignOcaSignatureDialog, {
        props: {
            defaultName: "Synthetic Signer",
            nameAndSignatureProps: {fontColor: "DarkBlue"},
            uploadSignature: () => undefined,
            close: () => undefined,
        },
    });
}

test("dialog loads only the original default font until styles are requested", async () => {
    onRpc("/web/sign/get_fonts/LaBelleAurore-Regular.ttf", () => {
        expect.step("default font");
        return [""];
    });
    onRpc("/web/sign/get_fonts/", () => {
        expect.step("all fonts");
        return ["", "", ""];
    });
    await mountSignature();
    expect.verifySteps(["default font"]);
    expect(".o_web_sign_name_input").toHaveValue("Synthetic Signer");
    expect(".o_web_sign_auto_button").toHaveCount(1);
    expect(".o_web_sign_draw_button").toHaveCount(1);
    expect(".o_web_sign_load_button").toHaveCount(1);
    await contains(".o_web_sign_auto_select_style button").click();
    expect.verifySteps(["all fonts"]);
    expect(".o-dropdown--menu .dropdown-item").toHaveCount(3);
    await contains(".o-dropdown--menu .dropdown-item:last-child").click();
    await contains(".o_web_sign_auto_select_style button").click();
    expect(".o-dropdown--menu .dropdown-item").toHaveCount(3);
    expect.verifySteps([]);
});

test("style download is shared by fields and failed downloads can retry", async () => {
    const first = {fonts: []};
    const second = {fonts: []};
    let fail = true;
    onRpc("/web/sign/get_fonts/", () => {
        expect.step("download");
        if (fail) {
            throw new Error("Synthetic font failure");
        }
        return ["first", "second"];
    });
    try {
        await SignOcaNameAndSignature.prototype.loadFonts.call(first);
    } catch {
        expect.step("retry allowed");
    }
    fail = false;
    await Promise.all([
        SignOcaNameAndSignature.prototype.loadFonts.call(first),
        SignOcaNameAndSignature.prototype.loadFonts.call(second),
    ]);
    expect(first.fonts).toEqual(["first", "second"]);
    expect(second.fonts).toEqual(first.fonts);
    expect.verifySteps(["download", "retry allowed", "download"]);
});

test("repeat clicks and keyboard focus open one dialog across fields", () => {
    const options = [];
    const parent = {
        info: {role_id: 1, partner: {name: "Synthetic Signer"}, items: {}},
        dialogService: {
            add(component, props, config) {
                expect(component).toBe(SignOcaSignatureDialog);
                options.push(config);
            },
        },
    };
    const element = registry.category("sign_oca").get("signature");
    const first = $(document.createElement("div"));
    const second = $(document.createElement("div"));
    const firstInput = element.generate(parent, {id: 1, role_id: 1}, first);
    const secondInput = element.generate(parent, {id: 2, role_id: 1}, second);
    firstInput.click();
    firstInput.click();
    first[0].dispatchEvent(new Event("focus_signature"));
    secondInput.click();
    expect(options).toHaveLength(1);
    options[0].onClose();
    secondInput.click();
    expect(options).toHaveLength(2);
});

test("a failed dialog add does not block the next attempt", () => {
    const parent = {
        info: {role_id: 1, partner: {name: "Synthetic Signer"}, items: {}},
        dialogService: {
            add: () => {
                throw new Error("Synthetic mount failure");
            },
        },
    };
    const element = registry.category("sign_oca").get("signature");
    // Invoke the event listener synchronously so the thrown error is observable.
    const listeners = [];
    const target = {addEventListener: (name, fn) => listeners.push([name, fn])};
    element.generate(parent, {id: 2, role_id: 1}, [target]);
    const open = listeners.find(([name]) => name === "focus_signature")[1];
    expect(open).toThrow("Synthetic mount failure");
    expect(parent.signatureDialogOpen).toBe(false);
    parent.dialogService.add = () => expect.step("reopened");
    open();
    expect.verifySteps(["reopened"]);
});

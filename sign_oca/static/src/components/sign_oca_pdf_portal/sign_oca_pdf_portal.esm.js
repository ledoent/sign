/** @odoo-module **/
/* global window */

import {mountComponent} from "@web/env";
import SignOcaPdf from "../sign_oca_pdf/sign_oca_pdf.esm.js";

import {MainComponentsContainer} from "@web/core/main_components_container";
import {rpc} from "@web/core/network/rpc";
import {startSignItemNavigator} from "./sign_oca_navigator.esm";
import {signal, whenReady} from "@odoo/owl";
import {useService} from "@web/core/utils/hooks";

export class SignOcaPdfPortal extends SignOcaPdf {
    setup() {
        this.rpc = rpc;
        this.ui = useService("ui");
        this.signOcaFooter = signal.ref();
        this.signer_id = this.props.signer_id;
        this.access_token = this.props.access_token;
        super.setup(...arguments);
    }
    async willStart() {
        this.info = await this.rpc(
            "/sign_oca/info/" + this.signer_id + "/" + this.access_token
        );
    }
    getPdfUrl() {
        return "/sign_oca/content/" + this.signer_id + "/" + this.access_token;
    }
    checkToSign() {
        this.to_sign = this.to_sign_update;
        if (this.to_sign_update) {
            $(this.signOcaFooter()).show();
            $("#sign_oca_button").removeAttr("disabled");
        } else {
            $(this.signOcaFooter()).hide();
            $("#sign_oca_button").prop("disabled", true);
        }
    }
    postIframeFields() {
        super.postIframeFields(...arguments);
        this.checkFilledAll();
        // Is essential to make sure the navigator will never duplicate
        const target = $(
            this.iframe().contentDocument.getElementById("viewerContainer")
        );
        const navigator = $(
            this.iframe().contentDocument.getElementsByClassName(
                "o_sign_sign_item_navigator"
            )
        );
        const navLine = $(
            this.iframe().contentDocument.getElementsByClassName(
                "o_sign_sign_item_navline"
            )
        );
        if (navLine.length === 0) {
            target.append($("<div class='o_sign_sign_item_navline'/>"));
        }
        if (navigator.length === 0) {
            target.append($("<div class='o_sign_sign_item_navigator'/>"));
        }
        // Load navigator
        this.navigate();
    }
    async _onClickSign(ev) {
        ev.target.disabled = true;
        const position = await this.getLocation();
        this.rpc("/sign_oca/sign/" + this.signer_id + "/" + this.access_token, {
            items: this.info.items,
            latitude: position && position.coords && position.coords.latitude,
            longitude: position && position.coords && position.coords.longitude,
        }).then((action) => {
            // As we are on frontend env, it is not possible to use do_action(), so we
            // redirect to the corresponding URL or reload the page if the action is not
            // an url.
            if (action.type === "ir.actions.act_url") {
                window.location = action.url;
            } else {
                window.location.reload();
            }
        });
    }
    navigate() {
        const target = this.iframe().contentDocument.getElementById("viewerContainer");
        this.navigator = startSignItemNavigator(this, target, this.ui);
    }
}
SignOcaPdfPortal.template = "sign_oca.SignOcaPdfPortal";
SignOcaPdfPortal.components = {MainComponentsContainer};

export async function initDocumentToSign(document, sign_oca_backend_info) {
    await whenReady();
    await mountComponent(SignOcaPdfPortal, document.body, {
        props: {
            access_token: sign_oca_backend_info.access_token,
            signer_id: sign_oca_backend_info.signer_id,
        },
    });
}
export default {SignOcaPdfPortal, initDocumentToSign};

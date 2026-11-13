import {
    Component,
    onMounted,
    onWillStart,
    onWillUnmount,
    signal,
    useProps,
} from "@odoo/owl";
/** @odoo-module **/
/* global window, setTimeout, document, clearTimeout */
import {_t} from "@web/core/l10n/translation";

import {AlertDialog} from "@web/core/confirmation_dialog/confirmation_dialog";
import {renderToString} from "@web/core/utils/render";
import {useService} from "@web/core/utils/hooks";

export default class SignOcaPdfCommon extends Component {
    props = useProps();
    setup() {
        super.setup(...arguments);
        this.orm = useService("orm");
        this.field_template = "sign_oca.sign_iframe_field";
        this.pdf_url = this.getPdfUrl();
        this.viewer_url = "/web/static/lib/pdfjs/web/viewer.html?file=" + this.pdf_url;
        this.iframe = signal.ref();
        var iframeResolve = "";
        var iframeReject = "";
        this.iframeLoaded = new Promise(function (resolve, reject) {
            iframeResolve = resolve;
            iframeReject = reject;
        });
        this.items = {};
        onWillUnmount(() => {
            clearTimeout(this.reviewFieldsTimeout);
        });
        this.iframeLoaded.resolve = iframeResolve;
        this.iframeLoaded.reject = iframeReject;
        onWillStart(this.willStart.bind(this));
        onMounted(() => {
            this.waitIframeLoaded();
        });
        this.dialogService = useService("dialog");
    }
    getPdfUrl() {
        return "/web/content/" + this.model + "/" + this.res_id + "/data";
    }
    async willStart() {
        this.info = await this.orm.call(this.model, "get_info", [[this.res_id]]);
    }
    waitIframeLoaded() {
        var error = this.iframe().contentDocument.getElementById("errorWrapper");
        if (error && window.getComputedStyle(error).display !== "none") {
            this.iframeLoaded.resolve();
            return this.dialogService.add(AlertDialog, {
                body: _t("Need a valid PDF to add signature fields !"),
            });
        }
        var nbPages =
            this.iframe().contentDocument.getElementsByClassName("page").length;
        var nbLayers =
            this.iframe().contentDocument.getElementsByClassName("endOfContent").length;
        if (nbPages > 0 && nbLayers > 0) {
            this.postIframeFields();
            this.reviewFields();
        } else {
            var self = this;
            setTimeout(function () {
                self.waitIframeLoaded();
            }, 50);
        }
    }
    reviewFields() {
        if (
            this.iframe().contentDocument.getElementsByClassName("o_sign_oca_ready")
                .length === 0
        ) {
            this.postIframeFields();
        }
        this.reviewFieldsTimeout = setTimeout(this.reviewFields.bind(this), 1000);
    }
    postIframeFields() {
        this.iframe()
            .contentDocument.getElementById("viewerContainer")
            .addEventListener(
                "drop",
                (e) => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                },
                true
            );
        var iframeCss = document.createElement("link");
        iframeCss.setAttribute("rel", "stylesheet");
        iframeCss.setAttribute("href", "/sign_oca/get_assets.css");

        this.iframe().contentDocument.getElementsByTagName("head")[0].append(iframeCss);
        $.each(this.info.items, (key) => {
            this.postIframeField(this.info.items[key]);
        });
        $(this.iframe().contentDocument.getElementsByClassName("page")[0]).append(
            $("<div class='o_sign_oca_ready'/>")
        );

        $(this.iframe().contentDocument.getElementById("viewer")).addClass(
            "sign_oca_ready"
        );
        this.iframeLoaded.resolve();
    }
    postIframeField(item) {
        if (this.items[item.id]) {
            this.items[item.id].remove();
        }
        var page =
            this.iframe().contentDocument.getElementsByClassName("page")[item.page - 1];
        var signatureItem = $(
            renderToString(this.field_template, {
                ...item,
            })
        );
        page.append(signatureItem[0]);
        this.items[item.id] = signatureItem[0];
        return signatureItem;
    }
    // CheckSignItemsCompletion and navigate functions for handling navigation
    checkSignItemsCompletion() {
        const signItemsToComplete = [];
        $.each(this.info.items, (key, value) => {
            if (this.postIframeField(value) && this.postIframeField(value)[0]) {
                const $element = $(value);
                const signItemToComplete = {};
                signItemToComplete.data = $element[0];
                signItemToComplete.el = this.postIframeField(value)[0];
                signItemsToComplete.push(signItemToComplete);
            }
        });
        return signItemsToComplete;
    }
}
SignOcaPdfCommon.template = "sign_oca.SignOcaPdfCommon";

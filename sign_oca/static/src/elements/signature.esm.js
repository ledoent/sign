/** @odoo-module **/
/* global Event */

import {SignOcaSignatureDialog} from "../components/signature_dialog/signature_dialog.esm";
import {registry} from "@web/core/registry";
import {renderToString} from "@web/core/utils/render";

const signatureSignOca = {
    uploadSignature: function (parent, item, signatureItem, data) {
        if (typeof data.signatureImage === "string") {
            item.value = data.signatureImage;
        } else if (Array.isArray(data.signatureImage)) {
            item.value = data.signatureImage[1];
        } else {
            throw new Error(
                "Signature must be an image file or a list of images of this format: 'data:image/png;base64,'"
            );
        }

        if (
            typeof item.value === "string" &&
            !item.value.startsWith("data:image/png;base64,")
        ) {
            item.value = "data:image/png;base64," + item.value;
        }
        parent.postIframeField(item);
        parent.checkFilledAll();
    },
    generate: function (parent, item, signatureItem) {
        var input = $(
            renderToString("sign_oca.sign_iframe_field_signature", {item: item})
        )[0];
        if (item.role_id === parent.info.role_id) {
            const openSignature = () => {
                // Dialog mounting waits for fonts. Repeated clicks must not stack
                // dialogs (and their downloads), including clicks on other fields.
                if (parent.signatureDialogOpen) {
                    return;
                }
                parent.signatureDialogOpen = true;
                const onClose = () => {
                    parent.signatureDialogOpen = false;
                };
                try {
                    parent.dialogService.add(
                        SignOcaSignatureDialog,
                        {
                            nameAndSignatureProps: {fontColor: "DarkBlue"},
                            defaultName: parent.info.partner.name,
                            uploadSignature: (data) =>
                                this.uploadSignature(parent, item, signatureItem, data),
                        },
                        {onClose}
                    );
                } catch (error) {
                    onClose();
                    throw error;
                }
            };
            signatureItem[0].addEventListener("focus_signature", openSignature);
            input.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                openSignature();
            });
            input.addEventListener("keydown", (ev) => {
                if ((ev.keyCode || ev.which) !== 9) {
                    return true;
                }
                ev.preventDefault();
                var next_items = Object.values(parent.info.items).filter(
                    (i) =>
                        i.tabindex > item.tabindex && i.role_id === parent.info.role_id
                );
                if (next_items.length > 0) {
                    ev.currentTarget.blur();
                    const nextItem = next_items[0];
                    if (nextItem && parent.items && parent.items[nextItem.id]) {
                        parent.items[nextItem.id].dispatchEvent(
                            new Event("focus_signature")
                        );
                    }
                }
            });
        }
        return input;
    },
    check: function (item) {
        return Boolean(item.value);
    },
};
registry.category("sign_oca").add("signature", signatureSignOca);

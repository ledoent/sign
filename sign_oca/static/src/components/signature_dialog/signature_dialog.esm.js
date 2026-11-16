/** @odoo-module **/

import {NameAndSignature} from "@web/core/signature/name_and_signature";
import {SignatureDialog} from "@web/core/signature/signature_dialog";
import {rpc} from "@web/core/network/rpc";

export class SignOcaNameAndSignature extends NameAndSignature {
    static template = "sign_oca.NameAndSignature";

    async loadFonts() {
        // Keep the full style list off the dialog's critical path. Share the
        // download between fields, but allow retry after a network failure.
        SignOcaNameAndSignature.fontsPromise ||= rpc("/web/sign/get_fonts/").catch(
            (error) => {
                SignOcaNameAndSignature.fontsPromise = undefined;
                throw error;
            }
        );
        this.fonts = await SignOcaNameAndSignature.fontsPromise;
    }
}

export class SignOcaSignatureDialog extends SignatureDialog {
    static components = {
        ...SignatureDialog.components,
        NameAndSignature: SignOcaNameAndSignature,
    };

    get nameAndSignatureProps() {
        return {
            ...super.nameAndSignatureProps,
            // Same first font as the core's sorted list, only 71 kB in base64
            // instead of downloading every script's fonts before mounting.
            defaultFont: "LaBelleAurore-Regular.ttf",
        };
    }
}

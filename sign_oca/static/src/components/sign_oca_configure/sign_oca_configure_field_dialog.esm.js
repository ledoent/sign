import {Component, signal, useProps} from "@odoo/owl";
/** @odoo-module */
/* Copyright 2024 Tecnativa - Carlos Roca
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl). */

import {Dialog} from "@web/core/dialog/dialog";

export class SignOcaConfigureFieldDialog extends Component {
    props = useProps();
    setup() {
        this.env.dialogData.dismiss = () => this._cancel();
        this.modalRef = signal.ref();
        this.isProcess = false;
    }

    async _cancel() {
        this.props.close();
    }

    async _confirm() {
        const $el = $(this.modalRef());
        await this.props.confirm(
            parseInt($el.find('select[name="field_id"]').val(), 10),
            parseInt($el.find('select[name="role_id"]').val(), 10),
            $el.find("input[name='required']").prop("checked"),
            $el.find("input[name='placeholder']").val()
        );
        this.props.close();
    }

    async _delete() {
        this.props.delete();
        this.props.close();
    }
}
SignOcaConfigureFieldDialog.template = "sign_oca.SignOcaConfigureFieldDialog";
SignOcaConfigureFieldDialog.components = {Dialog};

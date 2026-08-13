# Copyright 2023 Dixmit
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import fields, models


class SignOcaField(models.Model):
    _name = "sign.oca.field"
    _description = "Signature Field Type"

    name = fields.Char(required=True)
    field_type = fields.Selection(
        [
            ("text", "Text"),
            ("signature", "Signature"),
            ("check", "Check"),
            ("date", "Date"),
        ],
        required=True,
        default="text",
    )
    default_value = fields.Char(
        help="Text fields: name of a signer attribute (name, email, phone) "
        "used to prefill the value. Date fields: use 'today' to prefill "
        "the signing date; the signer can still change it."
    )

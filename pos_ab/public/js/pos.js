frappe.pages['point-of-sale'].refresh = async function () {
    function waitForChild(selector) {
        return new Promise((resolve) => {
            if (!"MutationObserver" in window) {
                alert("ETMS: Your Browser not supported")
            }
            const target = document.querySelector(selector)
            if (target) {
                return resolve(target)
            }

            const observer = new MutationObserver((mutations) => {
                const target = document.querySelector(selector)
                if (target) {
                    resolve(target);
                    observer.disconnect();
                }
            }
            );
            observer.observe(document.body, {
                childList: true,
                subtree: true
            })
        }
        );
    }
    function waitForProperty(obj, path, interval) {
        return new Promise(async (resolve) => {
            while (true) {
                await new Promise((r) => {
                    setTimeout(r, interval);
                });
                if (path.split('.').every(k => k in obj && (obj = obj[k], true))) {
                    resolve(true);
                    break;
                }
            }
            // dont continue property must be resolved
            // resolve(false);
        });
    }
    (async function () {
        await waitForProperty(window, "cur_pos.item_details.events", 1000);
        // global item details
        var itemDetails = cur_pos.item_details;
        // temp fix for awesomplete bug with open event
        var etmsBatchNoDidOpen = false;
        var _oToggleItemSelector = itemDetails.events.toggle_item_selector;
        itemDetails.events.toggle_item_selector = function (minimize) {
            _oToggleItemSelector.apply(this, [minimize]);

            var etms_pos_item_details_toggle = new CustomEvent("etms_pos_item_details_toggle", {
                detail: {
                    isOpen: minimize
                }
            });
            window.dispatchEvent(etms_pos_item_details_toggle);

        }
        window.addEventListener("etms_pos_item_details_toggle", function (e) {
            waitForChild("input[data-fieldname='batch_no']").then(function (mutations) {
                setTimeout(() => {
                    if (e.detail.isOpen && !itemDetails.batch_no_control.input.value) {
                        var batch_ctl = itemDetails.batch_no_control;
                        frappe.call({
                            method: 'frappe.client.get_value',
                            args: {
                                "doctype": "POS Profile",
                                "docname": cur_pos.pos_profile,
                                "fieldname": "automatically_select_oldest_item_batch_number"
                            },
                            callback: function (r) {
                                if (r.message.automatically_select_oldest_item_batch_number) {
                                    itemDetails.batch_no_control.input.focus();
                                }
                            }
                        });

                    } else {
                        // reset when navitage away from item view
                        etmsBatchNoDidOpen = false;
                    }
                }, 500);
            });

        });
        window.addEventListener("awesomplete-open", function () {
            if (!etmsBatchNoDidOpen) {
                etmsBatchNoDidOpen = true;
                itemDetails.batch_no_control.awesomplete.select();
            }
        });
    })();
}

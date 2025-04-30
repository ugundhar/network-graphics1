sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/f/library",
    "sap/m/MessageBox"
], function (Controller, fioriLibrary, MessageBox) {
    "use strict";

    return Controller.extend("com.odata.odata.controller.Detail", {
        onInit: function () {
            // Initialize the router
            this.oRouter = this.getOwnerComponent().getRouter();

            // Initialize FCL reference safely when view is rendered
            this.getView().addEventDelegate({
                onAfterRendering: function() {
                    this.oFCL = this.getView().getParent().getParent();
                }.bind(this)
            });
        },

        onNavBack: function() {
            // Get FCL reference and close the detail column
            var oFCL = this.oFCL;
            if (!oFCL) {
                try {
                    oFCL = this.getView().getParent().getParent();
                    this.oFCL = oFCL; // Cache for future use
                } catch (e) {
                    MessageBox.error("Navigation error: Could not return to previous screen");
                    console.error("FCL access error in Detail:", e);
                    return;
                }
            }

            if (oFCL) {
                oFCL.setLayout("OneColumn");
            }
        },

        onCloseDetailPress: function() {
            // Same as navBack - close the detail column
            this.onNavBack();
        },

        onMaintenanceOrderPress: function(oEvent) {
            sap.m.MessageToast.show("Maintenance Order 1015751/0010 clicked");
        }
    });
});
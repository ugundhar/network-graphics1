sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/f/library",
    "sap/m/MessageBox"
], function (Controller, fioriLibrary, MessageBox) {
    "use strict";

    return Controller.extend("com.odata.odata.controller.LineDetail", {
        onInit: function () {
            this.getView().addEventDelegate({
                onAfterRendering: function() {
                    this.oFCL = this.getView().getParent().getParent();
                }.bind(this)
            });
        },
        
        onCloseDetailPress: function() {
            var oFCL = this.oFCL;
            if (!oFCL) {
                try {
                    oFCL = this.getView().getParent().getParent();
                    this.oFCL = oFCL;
                } catch (e) {
                    MessageBox.error("Navigation error: Could not close detail view");
                    console.error("FCL access error:", e);
                    return;
                }
            }
            
            if (oFCL) {
                oFCL.setLayout(fioriLibrary.LayoutType.TwoColumnsBeginExpanded);
            }
        }
    });
}); 
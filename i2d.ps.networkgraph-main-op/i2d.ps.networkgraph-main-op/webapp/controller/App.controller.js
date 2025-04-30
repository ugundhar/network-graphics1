sap.ui.define([
	"i2d/ps/networkgraph/controller/BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("i2d.ps.networkgraph.controller.App", {
		/**
		 * Initialize method
		 * @public
		 */
		onInit: function () {
			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0
			});
			this.setModel(oViewModel, "appView");

			fnSetAppNotBusy = function () {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			// since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
			var oModel = this.getOwnerComponent().getModel();
			oModel.metadataLoaded().then(fnSetAppNotBusy);
			oModel.attachMetadataFailed(fnSetAppNotBusy);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
		}
	});
});
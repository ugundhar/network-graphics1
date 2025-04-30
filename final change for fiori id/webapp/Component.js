sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/odata/odata/model/models"
], function (UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("com.odata.odata.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// Call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// Initialize device model
			this.setModel(models.createDeviceModel(), "device");

			// Initialize view state models
			this.setModel(models.createOperationsModel(), "operations");
			this.setModel(models.createViewModel(), "viewModel");
			this.setModel(models.createGraphicsModel(), "graphicsData");

			// Initialize router
			this.getRouter().initialize();
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @returns {string} CSS class, either 'sapUiSizeCompact' or 'sapUiSizeCozy'
		 */
		getContentDensityClass: function () {
			if (!this._sContentDensityClass) {
				// Check whether FLP has already set the content density class
				if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) {
					// Apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}
	});
});



























// sap.ui.define([
// 	"sap/ui/core/UIComponent",
// 	"sap/ui/Device",
// 	"com/odata/odata/model/models",
// 	'sap/f/library',
// 	'sap/ui/model/json/JSONModel',
// ], function (UIComponent, Device, models, fioriLibrary,JSONModel) {
// 	"use strict";

// 	return UIComponent.extend("com.odata.odata.Component", {

// 		metadata: {
// 			manifest: "json"
// 		},

// 		/**
// 		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
// 		 * @public
// 		 * @override
// 		 */
// 		init: function () {
// 			var oModel,
// 				oProductsModel,
// 				oRouter;

// 			// call the base component's init function
// 			UIComponent.prototype.init.apply(this, arguments);
// 			oModel = new JSONModel();
// 			this.setModel(oModel);
// 			debugger;
// 			oRouter = this.getRouter();
// 			oRouter.attachBeforeRouteMatched(this._onBeforeRouteMatched, this);
// 			oRouter.initialize();
// 		},
// 		_onBeforeRouteMatched: function (oEvent) {
// 			var oModel = this.getModel(),
// 				sLayout = oEvent.getParameters().arguments.layout;

// 			// If there is no layout parameter, set a default layout (normally OneColumn)
// 			if (!sLayout) {
// 				sLayout = fioriLibrary.LayoutType.OneColumn;
// 			}

// 			oModel.setProperty("/layout", sLayout);
// 		}

// 	});
// });
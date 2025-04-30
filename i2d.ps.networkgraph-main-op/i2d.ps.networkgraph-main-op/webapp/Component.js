sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"i2d/ps/networkgraph/controller/ErrorHandler",
	"i2d/ps/networkgraph/model/formatter",
	"i2d/ps/networkgraph/model/networkODataModel"
], function (UIComponent, Device, ErrorHandler, formatter, networkODataModel) {
	"use strict";

	return UIComponent.extend("i2d.ps.networkgraph.Component", {

		requests: [],

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this method, the FLP and device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function () {
			UIComponent.prototype.init.apply(this, arguments);
			this._oErrorHandler = new ErrorHandler(this);
			this.getRouter().initialize();
			formatter.init(this.getResourceBundle());
			$.extend(true, this.getModel(), networkODataModel);

			$.ajaxSetup({
				global: true,
				beforeSend: function (xhr) {
					// this.requests.push(xhr);
				}.bind(this)
			});
			$(document).ajaxSend(function (event, jqxhr, settings) {
				this.requests.push(jqxhr);
			}.bind(this));
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getModel("i18n").getResourceBundle();
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				// eslint-disable-next-line sap-no-proprietary-browser-api
				if ($("body")[0].classList.contains("sapUiSizeCozy") || $("body")[0].classList.contains("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method ErrorHandler are destroyed.
		 * @public
		 * @override
		 */
		destroy: function () {
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		}

	});
});
sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";

	return {
		/**
		 * Creates a device model with screen size information
		 * @returns {sap.ui.model.json.JSONModel} Device model
		 */
		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		
		/**
		 * Creates a model for operations data
		 * @returns {sap.ui.model.json.JSONModel} Operations model
		 */
		createOperationsModel: function () {
			return new JSONModel({
				results: []
			});
		},
		
		/**
		 * Creates a model for view state (selected nodes, lines, etc.)
		 * @returns {sap.ui.model.json.JSONModel} View state model
		 */
		createViewModel: function () {
			return new JSONModel({
				selectedLine: null,
				busy: false,
				delay: 0
			});
		},
		
		/**
		 * Creates a model for graph data
		 * @returns {sap.ui.model.json.JSONModel} Graphics model
		 */
		createGraphicsModel: function () {
			var oModel = new JSONModel({
				nodes: [],
				lines: []
			});
			oModel.setSizeLimit(1000); // Set a high size limit for large graphs
			return oModel;
		}
	};
});
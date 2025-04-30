sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseObject, Filter, FilterOperator) {
	"use strict";

	return BaseObject.extend("com.odata.odata.service.NetworkGraphService", {
		
		constructor: function(oComponent) {
			this._oComponent = oComponent;
			this._oModel = oComponent.getModel();
		},
		
		/**
		 * Fetches operations and relationships for multiple orders
		 * @param {string[]} aOrderNumbers - Array of order numbers
		 * @returns {Promise} Promise resolving to combined result object
		 */
		getMultipleOrdersData: function(aOrderNumbers) {
			var that = this;
			var aPromises = [];
			
			// Create batch requests for each order
			aOrderNumbers.forEach(function(sOrderNumber) {
				var oOrderPromise = new Promise(function(resolve, reject) {
					that._fetchOrderData(sOrderNumber)
						.then(resolve)
						.catch(reject);
				});
				aPromises.push(oOrderPromise);
			});
			
			// Return promise that resolves when all order data is fetched
			return Promise.all(aPromises)
				.then(function(aResults) {
					// Combine all operations and relationships
					var aAllOperations = [];
					var aAllRelationships = [];
					var aErrors = [];
					
					aResults.forEach(function(oResult) {
						if (oResult.operations) {
							aAllOperations = aAllOperations.concat(oResult.operations);
						}
						if (oResult.relationships) {
							aAllRelationships = aAllRelationships.concat(oResult.relationships);
						}
						if (oResult.error) {
							aErrors.push(oResult.error);
						}
					});
					
					return {
						operations: aAllOperations,
						relationships: aAllRelationships,
						errors: aErrors
					};
				});
		},
		
		/**
		 * Fetches operations and relationships for a single order
		 * @private
		 * @param {string} sOrderNumber - Order number
		 * @returns {Promise} Promise resolving to result object
		 */
		_fetchOrderData: function(sOrderNumber) {
			var that = this;
			var oResult = {
				operations: [],
				relationships: [],
				error: null
			};
			
			// 1. Get Operations for this Order
			return new Promise(function(resolve, reject) {
				that._oModel.read("/MaintenanceOrder('" + sOrderNumber + "')/to_MaintenanceOrderOperation", {
					success: function(oData) {
						if (oData && oData.results) {
							oResult.operations = oData.results;
							
							// 2. Get Relationships for this Order
							that._fetchRelationships(sOrderNumber)
								.then(function(aRelationships) {
									oResult.relationships = aRelationships;
									resolve(oResult);
								})
								.catch(function(oError) {
									oResult.error = "Error fetching relationships for order " + sOrderNumber;
									resolve(oResult); // Still resolve with partial data
								});
						} else {
							oResult.error = "No operations found for order " + sOrderNumber;
							resolve(oResult);
						}
					},
					error: function(oError) {
						oResult.error = "Error fetching operations for order " + sOrderNumber;
						resolve(oResult); // Resolve with error to continue with other orders
					}
				});
			});
		},
		
		/**
		 * Fetches relationships for a single order
		 * @private
		 * @param {string} sOrderNumber - Order number
		 * @returns {Promise} Promise resolving to relationships array
		 */
		_fetchRelationships: function(sOrderNumber) {
			var that = this;
			return new Promise(function(resolve, reject) {
				var aFilters = [new Filter("MaintenanceOrder", FilterOperator.EQ, sOrderNumber)];
				that._oModel.read("/MaintOrderOpRelationship", {
					filters: aFilters,
					urlParameters: {
						"$select": "MaintenanceOrder,PredecessorOrderRoutingNode,SuccessorOrderRoutingNode,OrderOpRelationshipIntType"
					},
					success: function(oData) {
						resolve(oData.results || []);
					},
					error: function(oError) {
						reject(oError);
					}
				});
			});
		}
	});
}); 
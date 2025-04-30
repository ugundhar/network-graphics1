sap.ui.define([
	"i2d/ps/networkgraph/util/Constants",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/base/util/values"
], function (CONSTANTS, Filter, FilterOperator, Values) {
	"use strict";

	return {

		/**
		 * Gets filtered nodes by selected parameters.
		 * @param {object} oSelectedRanges selected parameters for highlighting
		 * @returns {Promise} a promise that is resolved when filtered nodes are received
		 * @public
		 */
		getAdvFilteredNodes: function (oSelectedRanges) {
			this._oSelectedRanges = oSelectedRanges;
			return this._filterByPS().then(function (aNodes) {
				if (this._hasOtherFilters()) {
					return this._filterNodesByOtherFilters(aNodes);
				}
				return aNodes;
			}.bind(this));
		},

		/**
		 * Cheks if there are other parameters except predecessor/successor.
		 * @returns {boolean} true if there are parameters except predecessor/successor, otherwise false
		 * @private
		 */
		_hasOtherFilters: function () {
			return Values(this._oSelectedRanges).some(function (oRange) {
				return CONSTANTS.ADV_HIGHLIGHT_FILTERS.PS.indexOf(oRange.keyField) < 0;
			});
		},

		/**
		 * Gets filtered nodes by predecessor/successor or all nodes.
		 * @returns {Promise} a promise that is resolved when nodes are received
		 * @private
		 */
		_filterByPS: function () {
			var bHasPredecessorFilter = this._hasFilter("NetworkActivityHasPredecessor"),
				bHasSuccessorFilter = this._hasFilter("NetworkActivityHasSuccessor"),
				mParameters = {
					sProject: this._sProject,
					sProjectNetwork: this._sProjectNetwork,
					sWBSElement: this._sWBSElement,
					bFillHasPredecessorProperty: bHasPredecessorFilter,
					bFillHasSuccessorProperty: bHasSuccessorFilter
				};
			if (bHasPredecessorFilter || bHasSuccessorFilter) {
				return this.getModel().getNodes(mParameters)
					.then(function (aData) {
						var aNodes = aData;
						if (bHasPredecessorFilter) {
							aNodes = this._filterByProperty(aNodes, "HasPredecessor", "NetworkActivityHasPredecessor");
						}
						if (bHasSuccessorFilter) {
							aNodes = this._filterByProperty(aNodes, "HasSuccessor", "NetworkActivityHasSuccessor");
						}
						return aNodes;
					}.bind(this));
			} else {
				return Promise.resolve(this._getNetworkModel().getProperty("/nodes"));
			}
		},

		/**
		 * Cheks if there is filter with entered name.
		 * @param {string} sFilterName filter name
		 * @returns {boolean} true if there is filter, otherwise false
		 * @private
		 */
		_hasFilter: function (sFilterName) {
			for (var sRangeId in this._oSelectedRanges) {
				if (this._oSelectedRanges[sRangeId].keyField === sFilterName) {
					return true;
				}
			}
			return false;
		},

		/**
		 * Filters nodes by predecessor/successor values.
		 * @param {Array} aNodes array of nodes
		 * @param {string} sNodeProperty filtered node property name
		 * @param {string} sFilterName filter name
		 * @returns {Array} filtered nodes
		 * @private
		 */
		_filterByProperty: function (aNodes, sNodeProperty, sFilterName) {
			var afilterValues = this._getFilterValues(sFilterName);
			return aNodes.filter(function (oNode) {
				return afilterValues.indexOf(oNode[sNodeProperty]) >= 0;
			});
		},

		/**
		 * Gets filter values.
		 * @param {string} sFilterName filter name
		 * @returns {Array} array of values
		 * @private
		 */
		_getFilterValues: function (sFilterName) {
			var aFilterValues = [];
			for (var sRangeId in this._oSelectedRanges) {
				if (this._oSelectedRanges[sRangeId].keyField === sFilterName) {
					aFilterValues.push(this._oSelectedRanges[sRangeId].value1);
				}
			}
			return aFilterValues;
		},

		/**
		 * Filters nodes by other defined filters besides predecessor, successor.
		 * @param {Array} aNodes array of nodes.
		 * @returns {Promise} a promise that resolves after filtering nodes
		 * @private
		 */
		_filterNodesByOtherFilters: function (aNodes) {
			return new Promise(function (fnResolve, fnReject) {
				this.getModel().read("/C_NtwkActivityGraphOverview", {
					urlParameters: {
						"$select": "ProjectNetworkInternalID,NetworkActivityInternalID"
					},
					filters: this._getFilters(aNodes),
					success: function (oData) {
						fnResolve(oData.results);
					},
					error: function (oError) {
						fnReject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Gets selected filters.
		 * @param {Array} aNodes array of nodes.
		 * @returns {Array} array of filters.
		 * @private
		 */
		_getFilters: function (aNodes) {
			var aFilters = [],
				aPropertiesRanges = this._splitRangesByProperties(),
				aNodesFilters = this._getNodesIDFilters(aNodes);
			aPropertiesRanges.forEach(function (aPropertiesRange) {
				var sFilterFunctionName = this._getFilterFunctionName(aPropertiesRange[0].keyField);
				if (sFilterFunctionName) {
					aFilters = this[sFilterFunctionName](aPropertiesRange, aFilters);
				}
			}.bind(this));
			return aFilters.concat(aNodesFilters);
		},

		/**
		 * Gets filter function name depends on key field.
		 * @param {string} sKeyField key field.
		 * @returns {string} filter function name.
		 * @private
		 */
		_getFilterFunctionName: function (sKeyField) {
			var bIsExcludeFilter = CONSTANTS.ADV_HIGHLIGHT_FILTERS.EXCLUDE.indexOf(sKeyField) < 0;
			if (bIsExcludeFilter) {
				return "_getOtherFilters";
			}
			var bIsSpecialFilter = CONSTANTS.ADV_HIGHLIGHT_FILTERS.SPECIAL.indexOf(sKeyField) >= 0;
			if (bIsSpecialFilter) {
				return "_getSpecialFilters";
			}
			var bIsStatusFilter = CONSTANTS.ADV_HIGHLIGHT_FILTERS.STATUSES.indexOf(sKeyField) >= 0;
			if (bIsStatusFilter) {
				return "_getStatusFilters";
			}
			return "";
		},

		/**
		 * Gets filters for network activity type, confirmation status.
		 * @param {Array} aPropertiesRanges  activity type, confirmation status ranges.
		 * @param {Array} aFilters array of all filters.
		 * @returns {Array} array of all filters.
		 * @private
		 */
		_getSpecialFilters: function (aPropertiesRanges, aFilters) {
			var aPropertyFilters = [];
			aPropertiesRanges.forEach(function (oPropertiesRange) {
				if (oPropertiesRange.value1.length) {
					oPropertiesRange.value1.forEach(function (oValue) {
						var sPropertyName = CONSTANTS.ADV_HIGHLIGHT.PROPERTY[oValue.key];
						aPropertyFilters.push(new Filter(sPropertyName, oPropertiesRange.operation, true));
					});
				}
			});
			aFilters.push(new Filter({
				filters: aPropertyFilters,
				and: false
			}));

			return aFilters;
		},

		/**
		 * Gets selected system and user status filters.
		 * @param {Array} aPropertiesRanges status ranges.
		 * @param {Array} aFilters array of all filters.
		 * @returns {Array} array of all filters.
		 * @private
		 */
		_getStatusFilters: function (aPropertiesRanges, aFilters) {
			var aPropertyFilters = [];
			aPropertiesRanges.forEach(function (oPropertiesRange) {
				if (oPropertiesRange.value1.length) {
					oPropertiesRange.value1.forEach(function (oValue) {
						var sPropertyName = CONSTANTS.ADV_HIGHLIGHT.PROPERTY[oPropertiesRange.keyField];
						aPropertyFilters.push(new Filter(sPropertyName, FilterOperator.Contains, oValue.text));
					});
				}
			});
			aFilters.push(new Filter({
				filters: aPropertyFilters,
				and: false
			}));

			return aFilters;
		},

		/**
		 * Gets other filters except indicated (predecessor/successor, statuses, network type).
		 * @param {Array} aPropertiesRanges status ranges.
		 * @param {Array} aFilters array of all filters.
		 * @returns {Array} array of all filters.
		 * @private
		 */
		_getOtherFilters: function (aPropertiesRanges, aFilters) {
			var aPropertyFilters = [];
			aPropertiesRanges.forEach(function (oPropertiesRange) {
				if (Array.isArray(oPropertiesRange.value1)) {
					oPropertiesRange.value1.forEach(function (oValue) {
						aPropertyFilters.push(new Filter(oPropertiesRange.keyField, oPropertiesRange.operation, oValue.key));
					});
				} else {
					aPropertyFilters.push(new Filter(oPropertiesRange.keyField, oPropertiesRange.operation, oPropertiesRange.value1,
						oPropertiesRange.value2));
				}
			});
			aFilters.push(new Filter({
				filters: aPropertyFilters,
				and: false
			}));
			return aFilters;
		},

		/**
		 * Returns array of selected ranges.
		 * @returns {Array} array of selected ranges
		 * @private
		 */
		_splitRangesByProperties: function () {
			return Values(this._oSelectedRanges).reduce(function (aResults, oRange) {
				var aMatch = aResults.find(function (aResult) {
					return aResult.some(function (oSplitRange) {
						return oSplitRange.keyField === oRange.keyField;
					});
				});
				if (aMatch) {
					aMatch.push(oRange);
				} else {
					aResults.push([oRange]);
				}
				return aResults;
			}, []);
		},

		/**
		 * Creates filters by nodes IDs.
		 * @param {Array} aNodes array of nodes.
		 * @returns {sap.ui.model.Filter} nodes IDs filters.
		 * @private
		 */
		_getNodesIDFilters: function (aNodes) {
			var aFilters = [];
			aNodes.forEach(function (oNode) {
				aFilters.push(new Filter({
					filters: [new Filter("ProjectNetworkInternalID", FilterOperator.EQ, oNode.ProjectNetworkInternalID),
						new Filter("NetworkActivityInternalID", FilterOperator.EQ, oNode.NetworkActivityInternalID)
					],
					and: true
				}));
			});
			return new Filter(aFilters, false);
		}
	};

});
sap.ui.define([], function () {
	"use strict";

	return  {

		/**
		 * Gets nodes.
		 * @param {object} mParameters Map which contains the following parameter properties:
		 * @param {string} mParameters.sProject project id
		 * @param {string} mParameters.sProjectNetwork project network id
		 * @param {string} mParameters.sWBSElement wbs element id
		 * @param {boolean} mParameters.bFillHasPredecessorProperty if true HasPredecessor filled in correctly
		 * @param {boolean} mParameters.bFillHasSuccessorProperty if true HasSuccessor filled in correctly
		 * @public
		 * @returns {Promise} a promise that is resolved when nodes are received
		 */
		getNodes: function (mParameters) {
			return new Promise(function (fnResolve, fnReject) {
				this.callFunction("/GetNetworkActivityNodeRelated", {
					method: "GET",
					urlParameters: {
						WBSElementExternalID: mParameters.sWBSElement,
						ProjectExternalID: mParameters.sProject,
						ProjectNetwork: mParameters.sProjectNetwork,
						FillHasPredecessorProperty: mParameters.bFillHasPredecessorProperty,
						FillHasSuccessorProperty: mParameters.bFillHasSuccessorProperty
					},
					success: function (oResponce) {
						fnResolve(oResponce.results);
					},
					error: function (oError) {
						fnReject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Gets lines.
		 * @param {Array} aFilters filters for lines
		 * @public
		 * @returns {Promise} a promise that is resolved when lines are received
		 */
		getLines: function (aFilters) {
			return new Promise(function (fnResolve, fnReject) {
				this.read("/I_ProjectNetworkRelationship", {
					filters: aFilters,
					success: function (oResponce) {
						fnResolve(oResponce.results);
					},
					error: function (oError) {
						fnReject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Gets attributes by view type.
		 * @param {Array} aFilters filters for attributes
		 * @public
		 * @returns {Promise} a promise that is resolved when attributes are received
		 */
		getAttributes: function (aFilters) {
			return new Promise(function (fnResolve, fnReject) {
				this.read("/NetworkActivityAttributesSet", {
					filters: aFilters,
					success: function (oResponce) {
						fnResolve(oResponce.results);
					},
					error: function (oError) {
						fnReject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Gets lines which involved in loops.
		 * @param {string} sProject project id
		 * @param {string} sProjectNetwork project network id
		 * @param {string} sWBSElement WBS element id
		 * @public
		 * @returns {Promise} a promise that is resolved when loop lines are received
		 */
		getLoopLines: function (sProject, sProjectNetwork, sWBSElement) {
			return new Promise(function (fnResolve, fnReject) {
				this.callFunction("/FindLoop", {
					method: "GET",
					urlParameters: {
						ProjectExternalID: sProject,
						ProjectNetwork: sProjectNetwork,
						WBSElementExternalID: sWBSElement,
						PredecessorProjNtwkIntID: "",
						PredecessorNtwkActyIntID: "",
						SuccessorProjNtwkIntID: "",
						SuccessorNtwkActyIntID: ""
					},
					success: function (oResponce) {
						fnResolve(oResponce.results);
					},
					error: function (oError) {
						fnReject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Gets assigned objects counts.
		 * @param {string} sProjectNetworkInternalID project network internal id
		 * @param {string} sNetworkActivityInternalID network activity internal id
		 * @public
		 * @returns {Promise} a promise that is resolved when assigned objects counts are received
		 */
		getIndicatorsCounters: function (sProjectNetworkInternalID, sNetworkActivityInternalID) {
			return new Promise(function (fnResolve, fnReject) {
				this.callFunction("/SidePanelCounters", {
					method: "GET",
					urlParameters: {
						ProjectNetworkInternalID: sProjectNetworkInternalID,
						NetworkActivityInternalID: sNetworkActivityInternalID,
						OnlyFlags: false
					},
					success: function (oResponce) {
						fnResolve(oResponce.SidePanelCounters);
					},
					error: function (oError) {
						fnReject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Gets activiy predecessor and successors.
		 * @param {string} sProjectNetworkInternalID project network internal id
		 * @param {string} sNetworkActivityInternalID network activity internal id
		 * @public
		 * @returns {Promise} a promise that is resolved when predecessor and successors are received
		 */
		getNetworkActivityRelationship: function (sProjectNetworkInternalID, sNetworkActivityInternalID) {
			return new Promise(function (fnResolve, fnReject) {
				this.callFunction("/GetNetworkActivityRelationship", {
					method: "GET",
					urlParameters: {
						ProjectNetworkInternalID: sProjectNetworkInternalID,
						NetworkActivityInternalID: sNetworkActivityInternalID
					},
					success: function (oResponce) {
						fnResolve(oResponce.results);
					},
					error: function (oError) {
						fnReject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Gets nodes that match the highlight parameters
		 * @param {Array} aFilters filters for highlighting
		 * @public
		 * @returns {Promise} a promise that is resolved when nodes are received
		 */
		getHighlightedNodes: function (aFilters) {
			return new Promise(function (fnResolve, fnReject) {
				this.read("/C_NtwkActivityGraphOverview", {
					filters: aFilters,
					success: function (oResponce) {
						fnResolve(oResponce.results);
					},
					error: function (oError) {
						fnReject(oError);
					}
				});
			}.bind(this));
		}
	};
});
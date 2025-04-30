sap.ui.define([
	"i2d/ps/networkgraph/util/Constants",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/BusyIndicator",
	"sap/m/MessageToast",
	"sap/base/strings/formatMessage",
	"i2d/ps/networkgraph/control/AHDialog",
	"i2d/ps/networkgraph/controller/mixins/AdvHighlight"
], function (CONSTANTS, Filter, FilterOperator, BusyIndicator, MessageToast, formatMessage, AHDialog, AdvHighlightMixin) {
	"use strict";

	var oHighlightMixin = $.extend(true, {

		/**
		 * Triggers advanced highlight functionality.
		 * @public
		 * @param {sap.ui.base.Event} oEvent button press event.
		 */
		onDefActionPress: function (oEvent) {
			var sText = oEvent.getSource().getText();
			if (sText === this.getResourceBundle().getText("AdvancedHighlight")) {
				this.onAdvHighlightPress();
			}
		},

		/**
		 * Event handler for higlight activities w/o successors (predecessors).
		 * Requests activities and highlights them.
		 * @public
		 * @param {string} sProperty highlight type
		 */
		onPredSuccHighlightPress: function (sProperty) {
			this._markHighlight(true, sProperty, {});
			if (this.isProjectNotEmpty()) {
				var sPropertyPath = CONSTANTS.HIGHLIGHT_FILTER[sProperty],
					bFillHasPredecessorProperty = sPropertyPath === CONSTANTS.HIGHLIGHT_FILTER.WO_PREDECESSORS,
					bFillHasSuccessorProperty = sPropertyPath === CONSTANTS.HIGHLIGHT_FILTER.WO_SUCCESSORS,
					mParameters = {
						sProject: this._sProject,
						sProjectNetwork: this._sProjectNetwork,
						sWBSElement: this._sWBSElement,
						bFillHasPredecessorProperty: bFillHasPredecessorProperty,
						bFillHasSuccessorProperty: bFillHasSuccessorProperty
					};
				BusyIndicator.show(0);
				this.getModel().getNodes(mParameters)
					.then(function (aNodes) {
						var aFilteredNodes = this._filterPredSuccNodes(aNodes, sPropertyPath);
						this._getNetworkModel().setProperty("/aHighlightedNodes", aFilteredNodes);
						this._highlightNodes();
						BusyIndicator.hide();
						this._showHighlightMessageToast();
						this._updateInnerAppState();
					}.bind(this)).catch(function (oError) {
						BusyIndicator.hide();
					});
			}
		},

		/**
		 * Creates filter for nodes depending on HasSuccessor or HasPredecessor property.
		 * @private
		 * @param {array} aNodes array of nodes data.
		 * @param {string} sPropertyPath name of property used for filtering. 
		 * @returns {array} array of filtered nodes data.
		 */
		_filterPredSuccNodes: function (aNodes, sPropertyPath) {
			return aNodes.filter(function (oNode) {
				if (sPropertyPath === CONSTANTS.HIGHLIGHT_FILTER.WO_SUCCESSORS) {
					return !oNode.HasSuccessor;
				} else {
					return !oNode.HasPredecessor;
				}
			});
		},

		/**
		 * Event handler for higlight activities by type and with delays.
		 * Requests activities depending on filter and highlights them.
		 * @public
		 * @param {string} sProperty highlight type
		 */
		onHighlightPress: function (sProperty) {
			this._markHighlight(true, sProperty, {});
			if (this.isProjectNotEmpty()) {
				var sPropertyPath = CONSTANTS.HIGHLIGHT_FILTER[sProperty],
					aFilters = this._getHighlightFilters(sPropertyPath);
				BusyIndicator.show(0);
				this.getModel().getHighlightedNodes(aFilters).then(function (aNodes) {
					this._getNetworkModel().setProperty("/aHighlightedNodes", aNodes);
					this._highlightNodes();
					BusyIndicator.hide();
					this._showHighlightMessageToast();
					this._updateInnerAppState();
				}.bind(this)).catch(function (oError) {
					BusyIndicator.hide();
				});
			}
		},

		/**
		 * Event handler. Opens advanced highlighting dialog.
		 * @public
		 * @param {sap.ui.base.Event} oEvent button press event.
		 */
		onAdvHighlightPress: function (oEvent) {
			if (!this._AHDialog) {
				this._AHDialog = new AHDialog({
					entityType: "C_NtwkActivityGraphOverviewType"
				});
				this._AHDialog.attachOk(this.onAdvHighlightOK.bind(this));
				this.getView().addDependent(this._AHDialog);
				this._AHDialog.initialize();
			}
			this._AHDialog.setSelectedRanges(this._getViewModel().getProperty("/oHighlight/oSelectedRanges"));
			this._AHDialog.open();
		},

		/**
		 * Event handler for higlight activities by properties.
		 * @param {sap.ui.base.Event} oEvent OK button press event.
		 * @public
		 */
		onAdvHighlightOK: function (oEvent) {
			var oSelectedRanges = oEvent.getParameter("selectedRanges");
			if (Object.keys(oSelectedRanges).length) {
				this._advHighlight(oSelectedRanges, true);
			} else {
				this.onResetHighlighting();
			}
		},

		/**
		 * Filter and highlight nodes for advanced highlighting.
		 * @param {object} oSelectedRanges selected ranges
		 * @param {boolean} bSave save highlight data if true
		 * @private
		 */
		_advHighlight: function (oSelectedRanges, bSave) {
			if (bSave) {
				this._markHighlight(true, "ADV_HIGHLIGHT", oSelectedRanges);
			}
			if (this.isProjectNotEmpty()) {
				BusyIndicator.show(0);
				this.getAdvFilteredNodes(oSelectedRanges).then(function (aFilteredNodes) {
					this._getNetworkModel().setProperty("/aHighlightedNodes", aFilteredNodes);
					this._highlightNodes();
					BusyIndicator.hide();
					this._showHighlightMessageToast();
					this._updateInnerAppState();
				}.bind(this)).catch(function (oError) {
					BusyIndicator.hide();
				});
			}
		},

		/**
		 * Event handler for no higlight.
		 * Clears highlight nodes data from network model.
		 * @public
		 */
		onResetHighlighting: function () {
			this._markHighlight(false, "NO_HIGHLIGHT", {});
			if (this.isProjectNotEmpty()) {
				this._getNetworkModel().setProperty("/aHighlightedNodes", []);
				this._highlightNodes();
			}
		},

		/**
		 * Sets highlight data to view model.
		 * @private
		 * @param {boolean} bHighlightOn is highlight selected.
		 * @param {string} sHighlightType type of highlight.
		 * @param {object} oSelectedRanges selected highlight ranges.
		 */
		_markHighlight: function (bHighlightOn, sHighlightType, oSelectedRanges) {
			var oViewModel = this._getViewModel();
			oViewModel.setProperty("/oHighlight/bHighlightOn", bHighlightOn);
			oViewModel.setProperty("/oHighlight/sType", sHighlightType);
			oViewModel.setProperty("/oHighlight/oSelectedRanges", oSelectedRanges);
			this.changeFilterData("oHighlight");
		},

		/**
		 * Creates filter for each activity depending on filter property.
		 * @private
		 * @param {string} sPropertyPath name of property used for filtering.
		 * @returns {sap.ui.model.Filter} filter for highlighted activities.
		 */
		_getHighlightFilters: function (sPropertyPath) {
			var aNodes = this._getNetworkModel().getProperty("/nodes"),
				aHighlightFilters = [],
				sFilterOperator,
				vFilterValue;

			if (sPropertyPath === CONSTANTS.HIGHLIGHT_FILTER.COST ||
				sPropertyPath === CONSTANTS.HIGHLIGHT_FILTER.SERVICE ||
				sPropertyPath === CONSTANTS.HIGHLIGHT_FILTER.INTERNAL ||
				sPropertyPath === CONSTANTS.HIGHLIGHT_FILTER.EXTERNAL) {

				sFilterOperator = FilterOperator.EQ;
				vFilterValue = true;
			} else {
				sFilterOperator = FilterOperator.NE;
				vFilterValue = 0;
			}

			aNodes.forEach(function (oNode) {
				aHighlightFilters.push(new Filter({
					filters: [
						new Filter("ProjectNetworkInternalID", FilterOperator.EQ, oNode.ProjectNetworkInternalID),
						new Filter("NetworkActivityInternalID", FilterOperator.EQ, oNode.NetworkActivityInternalID),
						new Filter(sPropertyPath, sFilterOperator, vFilterValue)
					],
					and: true
				}));
			});

			return [new Filter({
				filters: aHighlightFilters,
				and: false
			})];
		},

		/**
		 * Loops through all graph nodes and sets their status depending on highlight and search criteria.
		 * Search criteria are higher then highlight criteria. 
		 * @private
		 */
		_highlightNodes: function () {
			var oModel = this._getNetworkModel(),
				aNodes = oModel.getProperty("/nodes"),
				aHighlightedNodes = oModel.getProperty("/aHighlightedNodes") || [],
				aSearchedNodes = oModel.getProperty("/aSearchedNodes") || [];

			aNodes.forEach(function (oNode) {
				var bIsHighlighted = !!aHighlightedNodes.find(function (oHighlightedNode) {
						return oNode.ProjectNetworkInternalID === oHighlightedNode.ProjectNetworkInternalID &&
							oNode.NetworkActivityInternalID === oHighlightedNode.NetworkActivityInternalID;
					}),
					bIsSearched = !!aSearchedNodes.find(function (oSearchedNode) {
						var oSearchedNodeData = oSearchedNode.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getObject();
						return oNode.ProjectNetworkInternalID === oSearchedNodeData.ProjectNetworkInternalID &&
							oNode.NetworkActivityInternalID === oSearchedNodeData.NetworkActivityInternalID;
					});

				if (bIsSearched) {
					oNode.nodeStatus = this._getFinedNodeStatus(oNode, oNode.attributes[0]);
				} else if (bIsHighlighted) {
					oNode.nodeStatus = this._getHighlightedNodeStatus(oNode, oNode.attributes[0]);
				} else {
					oNode.nodeStatus = this._getNodeStatus(oNode, oNode.attributes[0]);
				}
			}.bind(this));

			if (aHighlightedNodes.length && !this._getSelectedNode()) {
				var oFirstNode = this._getNodeControl(aHighlightedNodes[0]);
				this._oGraph.scrollToElement(oFirstNode);
			}

			oModel.setProperty("/nodes", aNodes);
			this._updateMap();
		},

		/**
		 * Displays Message Toast with amount of highlighted nodes.
		 * @private
		 */
		_showHighlightMessageToast: function () {
			var oModel = this._getNetworkModel(),
				iHighlightedNodesAmount = oModel.getProperty("/aHighlightedNodes").length,
				sText;
			if (iHighlightedNodesAmount) {
				sText = this.getResourceBundle().getText("HighlightResultMessageText");
				MessageToast.show(formatMessage(sText, iHighlightedNodesAmount));
			} else {
				sText = this.getResourceBundle().getText("NoHighlightResultMessageText");
				MessageToast.show(sText);
			}
		}

	}, AdvHighlightMixin);
	return oHighlightMixin;
});
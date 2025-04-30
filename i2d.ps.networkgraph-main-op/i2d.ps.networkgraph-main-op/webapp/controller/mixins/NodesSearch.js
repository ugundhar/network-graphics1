sap.ui.define([
	"i2d/ps/networkgraph/util/Constants",
	"sap/m/MessageToast",
	"sap/base/strings/formatMessage"
], function (CONSTANTS, MessageToast, formatMessage) {
	"use strict";

	return {

		/**
		 * Search suggest handler. Starts activity suggestions after entering 3 letter. Suggests up to 15 items. 
		 * @param {sap.ui.base.Event} oEvent event object.
		 * @public
		 */
		onSearchSuggest: function (oEvent) {
			var aSuggestionItems = [],
				aItems = this._getNetworkModel().getProperty("/nodes"),
				aFilteredItems = [],
				sTerm = oEvent.getParameter("term");

			sTerm = sTerm ? sTerm : "";

			if (sTerm.length > 2) {
				aFilteredItems = this._getFilteredItems(aItems, sTerm).slice(0, 15);
				aSuggestionItems = this._getSuggestionItems(aFilteredItems);
				this._oGraph.setSearchSuggestionItems(aSuggestionItems);
			} else {
				this._oGraph.setSearchSuggestionItems([]);
			}

			oEvent.bPreventDefault = true;
		},

		/**
		 * Search handler. Highlights found activities.
		 * @param {sap.ui.base.Event} oEvent event object.
		 * @public
		 */
		onSearch: function (oEvent) {
			var sKeyNode = oEvent.getParameter("key"),
				sTerm = oEvent.getParameter("term");
			if (sKeyNode) {
				this._singleSearch(sKeyNode);
			} else {
				this._multipleSearch(sTerm);
			}
			this._highlightNodes();
			this._showSearchMessageToast();
			oEvent.bPreventDefault = true;
		},
		
		/**
		 * Displays Message Toast with amount of finded nodes.
		 * @private
		 */
		_showSearchMessageToast: function () {
			var oModel = this._getNetworkModel(),
				aSearchedNodes = oModel.getProperty("/aSearchedNodes") || [],
				iFindedNodesAmount = aSearchedNodes.length,
				sText;
			if (iFindedNodesAmount) {
				sText = this.getResourceBundle().getText("SearchResultMessageText");
				MessageToast.show(formatMessage(sText, iFindedNodesAmount));
			} else {
				sText = this.getResourceBundle().getText("NoSearchResultMessageText");
				MessageToast.show(sText);
			}
		},

		/**
		 * Highlights found single activity.
		 * @param {string} sKeyNode node key
		 * @private
		 */
		_singleSearch: function (sKeyNode) {
			var oNode = this._oGraph.getNodeByKey(sKeyNode);
			this._setSearchStatus(oNode);
			this._oGraph.scrollToElement(oNode);
			this._getNetworkModel().setProperty("/aSearchedNodes", [oNode]);
		},

		/**
		 * Highlights found activities.
		 * @param {string} sTerm entered text
		 * @private
		 */
		_multipleSearch: function (sTerm) {
			if (sTerm) {
				var aNodes = this._getNetworkModel().getProperty("/nodes"),
					aFilteredNodes = this._getFilteredItems(aNodes, sTerm),
					aSearchedNodes = [];
				aFilteredNodes.forEach(function (oNode) {
					var oNodeControl = this._oGraph.getNodeByKey(oNode.ProjectNetworkInternalID + oNode.NetworkActivityInternalID);
					this._setSearchStatus(oNodeControl);
					aSearchedNodes.push(oNodeControl);
				}.bind(this));
				this._getNetworkModel().setProperty("/aSearchedNodes", aSearchedNodes);
				if (aFilteredNodes.length) {
					var oFirstNode = this._getNodeControl(aFilteredNodes[0]);
					this._oGraph.scrollToElement(oFirstNode);
				}
			} else {
				this._getNetworkModel().setProperty("/aSearchedNodes", []);
			}
		},

		/**
		 * Clears activity search.
		 * @private
		 */
		_clearSearch: function () {
			var oSearch = this._oGraph._searchField;
			if (oSearch) {
				oSearch.clear();
				this._getNetworkModel().setProperty("/aSearchedNodes", []);
			}
		},

		/**
		 * Highlights activity by changing node status.
		 * @param {object} oNode node control
		 * @private
		 */
		_setSearchStatus: function (oNode) {
			var oModel = this._getNetworkModel(),
				oContext = oNode.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME),
				oContextObj = oContext.getObject(),
				sPath = oContext.getPath(),
				sStatus = this._getFinedNodeStatus(oContextObj, oContextObj.attributes[0]);
			oModel.setProperty(sPath + "/nodeStatus", sStatus);
		},

		/**
		 * Filters node by entered text
		 * @param {Array} aItems nodes
		 * @param {string} sTerm entered text
		 * @private
		 * @returns {Array} filtered nodes
		 */
		_getFilteredItems: function (aItems, sTerm) {
			return aItems.filter(function (oItem) {
				var sComparisonLine = oItem.ProjectNetwork + " - " + oItem.NetworkActivity + " - " + oItem.NetworkActivityDescription;
				return sComparisonLine.toLowerCase().indexOf(sTerm.toLowerCase()) !== -1;
			});
		},

		/**
		 * Create and sort suggestion items.
		 * @param {Array} aFilteredItems filtered nodes
		 * @private
		 * @returns {Array} suggestion items
		 */
		_getSuggestionItems: function (aFilteredItems) {
			var aSuggestionItems = [];
			aFilteredItems.sort(function (oItem1, oItem2) {
				return oItem1.ProjectNetwork.localeCompare(oItem2.ProjectNetwork);
			}).forEach(function (oItem) {
				aSuggestionItems.push(new sap.m.SuggestionItem({
					key: oItem.ProjectNetworkInternalID + oItem.NetworkActivityInternalID,
					text: oItem.ProjectNetwork + " - " + oItem.NetworkActivity + " - " + oItem.NetworkActivityDescription
				}));
			});
			return aSuggestionItems;
		}

	};

});
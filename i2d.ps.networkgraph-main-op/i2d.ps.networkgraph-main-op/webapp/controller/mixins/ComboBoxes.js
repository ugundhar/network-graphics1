sap.ui.define([
	"i2d/ps/networkgraph/util/Constants",
	"sap/ui/core/BusyIndicator",
	"sap/ui/core/ValueState",
	"sap/m/Button",
	"sap/ui/model/Filter",
	"sap/suite/ui/commons/networkgraph/Group",
	"sap/base/strings/formatMessage"
], function (CONSTANTS, BusyIndicator, ValueState, Button, Filter, Group, formatMessage) {
	"use strict";

	return {

		/**
		 * Helper method on graph toolbar combobox change.
		 * Validates combobox depending on selected key.
		 * @private
		 * @param {sap.m.ComboBox} oValidatedComboBox comboBox object.
		 * @param {string} sTextKey i18n text key for invalid case.
		 * @param {function} fnHandlerFunc function that handles combobox change.
		 */
		_onComboboxChange: function (oValidatedComboBox, sTextKey, fnHandlerFunc) {
			var sSelectedKey = oValidatedComboBox.getSelectedKey(),
				sValue = oValidatedComboBox.getValue();

			if (!sSelectedKey && sValue) {
				var sText = this.getResourceBundle().getText(sTextKey);
				oValidatedComboBox.setValueStateText(sText);
				oValidatedComboBox.setValueState(ValueState.Error);
			} else {
				fnHandlerFunc();
				oValidatedComboBox.setValueState(ValueState.None);
				this._updateInnerAppState();
			}
		},

		/**
		 * Event handler on view combobox change.
		 * Changes nodes attributes depending on view type.
		 * Sets view key to filter data.
		 * @public
		 * @param {sap.ui.base.Event} oEvent view combobox change event.
		 */
		onViewComboBoxChange: function (oEvent) {
			var oComboBox = oEvent.getSource();
			this.changeFilterData("sViewKey");
			this._onComboboxChange(oComboBox, "WrongViewText", this._changeNodeAttributesByView.bind(this));
		},

		/**
		 * Event handler on grouping combobox change.
		 * Changes grouping depending on selected grouping type.
		 * Sets group key to filter data.
		 * @public
		 * @param {sap.ui.base.Event} oEvent grouping combobox change event.
		 */
		onGroupComboBoxChange: function (oEvent) {
			var oComboBox = oEvent.getSource();
			this.changeFilterData("sGroupKey");
			this._onComboboxChange(oComboBox, "WrongGroupText", this._changeGrouping.bind(this));
		},

		/**
		 * Gets attributes for nodes depending on view key.
		 * @private
		 */
		_changeNodeAttributesByView: function () {
			if (this.isProjectNotEmpty()) {
				BusyIndicator.show(0);
				var oModel = this._getNetworkModel(),
					aNodes = oModel.getProperty("/nodes");
				this.getModel().getAttributes(this._getAttributesFilters(aNodes)).then(function (aAttributes) {
					this._clearAttributes();
					this._adaptNetworkModel(aAttributes);
					this._oGraph.rerender();
					BusyIndicator.hide();
				}.bind(this)).catch(function (oError) {
					BusyIndicator.hide();
				});
			}
		},

		/**
		 * Clears attributes for all nodes in a view model.
		 * @private
		 */
		_clearAttributes: function () {
			var oModel = this._getNetworkModel(),
				aNodes = oModel.getProperty("/nodes");
			aNodes.forEach(function (oNode) {
				if (oNode.attributes) {
					delete oNode.attributes;
				}
				if (oNode.staticAttributes) {
					delete oNode.staticAttributes;
				}
			});
			oModel.setProperty("/nodes", aNodes);
		},

		/**
		 * Creates groups depending on selected grouping type.
		 * @private
		 */
		_changeGrouping: function () {
			if (this.isProjectNotEmpty()) {
				var sGroupKey = this._getViewModel().getProperty("/sGroupKey"),
					isNetworkGroup = sGroupKey === CONSTANTS.GROUPING_NAME.NETWORK,
					sGroupPath = this._getGroupPath(sGroupKey),
					sPropertyName = isNetworkGroup ? "ProjectNetwork" : "WBSElementExternalID",
					sFilterPropertyName = isNetworkGroup ? "ProjectNetwork" : "WBSElement",
					oBindingInfo = {
						path: sGroupPath,
						length: CONSTANTS.SIZE_LIMIT,
						filters: [new Filter({
							filters: this._getUniqueFiltersByProperties([{
								sPropertyName: sPropertyName,
								sFilterPropertyName: sFilterPropertyName
							}], true),
							and: false
						})],
						template: new sap.suite.ui.commons.networkgraph.Group({
							key: {
								path: sFilterPropertyName
							},
							title: {
								parts: isNetworkGroup ? [sFilterPropertyName, "SuperiorProjectNetwork", "to_NetworkActivityByInternalKey/NetworkActivity"] : [
									"i18n>WBSElementGroupName", sFilterPropertyName
								],
								formatter: isNetworkGroup ? this.formatter.getNetworkGroupTitle : formatMessage
							},
							showDetail: this._openGroupSplitPane.bind(this)
						}),
						events: {
							dataRequested: function () {
								BusyIndicator.show(0);
							},
							dataReceived: function () {
								this._changeGroupKeyForNodes(sPropertyName, false);
								this._oGraph.rerender();
								BusyIndicator.hide();
							}.bind(this)
						}
					};

				if (isNetworkGroup) {
					oBindingInfo.parameters = {
						expand: "to_NetworkActivityByInternalKey"
					};
				}

				this._changeGroupKeyForNodes(sPropertyName, true);
				this._oGraph.bindAggregation("groups", oBindingInfo);
			}
		},

		/**
		 * Returns binding path for groups depending on selected grouping type.
		 * @private
		 * @param {string} sGroupKey selected grouping path. 
		 * @returns {string} binding path for groups aggregation.
		 */
		_getGroupPath: function (sGroupKey) {
			switch (sGroupKey) {
			case CONSTANTS.GROUPING_NAME.NETWORK:
				return CONSTANTS.GROUPING_PATH.NETWORK;
			case CONSTANTS.GROUPING_NAME.WBS:
				return CONSTANTS.GROUPING_PATH.WBS;
			default:
				return "";
			}
		},

		/**
		 * Removes default collapse action button from groups.
		 * @private
		 */
		_removeCollapseButtonInGroups: function () {
			this._oGraph.getGroups().forEach(function (oGroup) {
				if (oGroup._oActionButtons.collapse) {
					oGroup._oActionButtons.collapse.remove();
				}
			});
		},

		/**
		 * Sets new status to group control.
		 * @private
		 * @param {sap.suite.ui.commons.networkgraph.Group} oGroupControl - control to which status will be set
		 * @param {string} sStatus - new status
		 */
		_changeGroupStatus: function (oGroupControl, sStatus) {
			oGroupControl.setStatus(sStatus);
			setTimeout(function () {
				if (oGroupControl._oActionButtons.collapse) {
					oGroupControl._oActionButtons.collapse.remove();
				}
			}, 0);
		},

		/**
		 * Event handler on opening group side panel.
		 * @private
		 * @param {sap.ui.base.Event} oEvent group show detail event. 
		 */
		_openGroupSplitPane: function (oEvent) {
			var oViewModel = this._getViewModel(),
				isNetworkGroup = oViewModel.getProperty("/sGroupKey") === CONSTANTS.GROUPING_NAME.NETWORK,
				isWbsGroup = oViewModel.getProperty("/sGroupKey") === CONSTANTS.GROUPING_NAME.WBS,
				oGroupControl = oEvent.getSource();

			if (isNetworkGroup) {
				var sProjectNetwork = oGroupControl.getBindingContext().getProperty("ProjectNetwork");
				this.openNetworkSplitPane(sProjectNetwork);
			} else if (isWbsGroup) {
				var sWbs = oGroupControl.getBindingContext().getProperty("WBSElement");
				this.openWbsSplitPane(sWbs);
			}
			this._removeGroupHighlight();
			this._changeGroupStatus(oGroupControl, "SelectedGroup");
			oEvent.bPreventDefault = true;
		},

		/**
		 * Changes group key for nodes.
		 * @private
		 * @param {string} sKeyPropertyName name of property used as group key.
		 * @param {boolean} bReset whether to remove group key or add. 
		 */
		_changeGroupKeyForNodes: function (sKeyPropertyName, bReset) {
			var aNodes = this._getNetworkModel().getProperty("/nodes");
			aNodes.forEach(function (oNode) {
				oNode.groupKey = bReset ? "" : oNode[sKeyPropertyName];
			});
			this._getNetworkModel().setProperty("/nodes", aNodes);
		},

		/**
		 * Scrolls to previosly focused node if exists.
		 * @private
		 */
		_returnFocus: function () {
			if (this._oFocus) {
				this._oGraph.scrollToElement(this._oFocus);
			}
		},

		/**
		 * Searches for selected node.
		 * @private
		 * @returns {sap.suite.ui.commons.networkgraph.Node} selected node. 
		 */
		_getSelectedNode: function () {
			var aNodes = this._oGraph.getNodes();
			return aNodes.find(function (oNode) {
				return oNode.getSelected();
			});
		}
	};

});
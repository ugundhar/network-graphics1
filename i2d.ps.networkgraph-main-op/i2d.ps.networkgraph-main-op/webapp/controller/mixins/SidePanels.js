sap.ui.define([
	"i2d/ps/networkgraph/util/Constants",
	"sap/ui/core/Fragment",
	"sap/m/Button",
	"sap/suite/ui/commons/networkgraph/ElementStatus",
	"sap/ui/generic/app/navigation/service/NavigationHandler",
	"sap/ui/generic/app/navigation/service/SelectionVariant",
	"sap/ui/model/json/JSONModel"
], function (CONSTANTS, Fragment, Button, ElementStatus, NavigationHandler, SelectionVariant, JSONModel) {
	"use strict";

	return {

		/**
		 * Changes side page visibility.
		 * @param {string} sFragmentProperty fragment visibility property name
		 * @private
		 */
		_setPageVisible: function (sFragmentProperty) {
			var oModel = this._getViewModel(),
				aProperties = ["/bNetworkPageVisible", "/bConnectorPageVisible", "/bActivitySidePaneVisible", "/bWbsPaneVisible"];
			aProperties.forEach(function (sProperty) {
				var bVisible = sProperty === sFragmentProperty;
				oModel.setProperty(sProperty, bVisible);
			});
		},

		/**
		 * Opens network side panel.
		 * @param {string} sProjectNetwork selected network id
		 * @public
		 */
		openNetworkSplitPane: function (sProjectNetwork) {
			this._openSidePane();
			this._setPageVisible("/bNetworkPageVisible");
			this._bindNetworkSplitPane(sProjectNetwork);
		},

		/**
		 * Binds network side panel to the provided network.
		 * @param {string} sProjectNetwork selected network id
		 * @private
		 */
		_bindNetworkSplitPane: function (sProjectNetwork) {
			var sFragmentId = this.getView().createId("networkFragment"),
				oNetworkSidePane = Fragment.byId(sFragmentId, "networkSidePane"),
				sPath = this.getModel().createKey("/C_ProjectNetworkGraphOverview", {
					ProjectNetwork: sProjectNetwork,
					Version: ""
				});

			oNetworkSidePane.bindElement({
				path: sPath,
				parameters: {
					expand: "to_Project,to_WBSElement"
				},
				events: {
					dataRequested: function () {
						oNetworkSidePane.setBusy(true);
						if (this._fnAfterNavBack) {
							this._oGraph.detachEvent("afterLayouting", this._fnAfterNavBack);
						}
					}.bind(this),
					dataReceived: function () {
						this.getModel().invalidateEntry(oNetworkSidePane.getBindingContext());
						this._updateInnerAppState();
						oNetworkSidePane.setBusy(false);
					}.bind(this)
				}
			});
		},

		/**
		 * Opens connector side panel.
		 * @param {sap.suite.ui.commons.networkgraph.Line} oLine selected line control
		 * @public
		 */
		openConnectorSplitPane: function (oLine) {
			this._openSidePane();
			this._setPageVisible("/bConnectorPageVisible");
			this._bindConnectorSplitPane(oLine);
		},

		/**
		 * Binds connector side panel to the provided line.
		 * @param {sap.suite.ui.commons.networkgraph.Line} oLine selected line control
		 * @private
		 */
		_bindConnectorSplitPane: function (oLine) {
			var sFragmentId = this.getView().createId("connectorFragment"),
				oConnectorSidePane = Fragment.byId(sFragmentId, "connectorSidePane"),
				oContextObj = oLine.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getObject(),
				sPath = this.getModel().createKey("/C_ProjectNetworkRelationship", {
					PredecessorProjNtwkIntID: oContextObj.PredecessorProjNtwkIntID,
					PredecessorNtwkActyIntID: oContextObj.PredecessorNtwkActyIntID,
					SuccessorProjNtwkIntID: oContextObj.SuccessorProjNtwkIntID,
					SuccessorNtwkActyIntID: oContextObj.SuccessorNtwkActyIntID,
					NetworkActivityRelationType: oContextObj.NetworkActivityRelationType,
					MaxTimeIntvlIsUsedForSchedg: oContextObj.MaxTimeIntvlIsUsedForSchedg
				});
			oConnectorSidePane.bindElement({
				path: sPath,
				events: {
					dataRequested: function () {
						oConnectorSidePane.setBusy(true);
						if (this._fnAfterNavBack) {
							this._oGraph.detachEvent("afterLayouting", this._fnAfterNavBack);
						}
					}.bind(this),
					dataReceived: function () {
						this.getModel().invalidateEntry(oConnectorSidePane.getBindingContext());
						this._updateInnerAppState();
						oConnectorSidePane.setBusy(false);
					}.bind(this)
				}
			});
		},

		/**
		 * Opens and bind activity side panel no more than once a second.
		 * @param {sap.suite.ui.commons.networkgraph.Node} oNode selected node control
		 * @public
		 */
		openActivitySplitPane: function (oNode) {
			var oContextObj = oNode.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getObject(),
				sNetworkActivityInternalID = oContextObj.NetworkActivityInternalID,
				sProjectNetworkInternalID = oContextObj.ProjectNetworkInternalID;
			this._openSidePane();
			this._setPageVisible("/bActivitySidePaneVisible");
			clearTimeout(this.debounce);
			this.debounce = setTimeout(function () { // eslint-disable-line sap-timeout-usage
				this._bindActivitySplitPane(sProjectNetworkInternalID, sNetworkActivityInternalID);
				this._updateIndicatorsModel(sProjectNetworkInternalID, sNetworkActivityInternalID);
				this._bindRelationshipsPanel(sProjectNetworkInternalID, sNetworkActivityInternalID);
			}.bind(this), 500);
		},

		/**
		 * Binds successor / predecessor popover to provided activity.
		 * @private
		 * @param {string} sProjectNetworkInternalID - project network ID
		 * @param {string} sNetworkActivityInternalID - network activity ID
		 */
		_bindRelationshipsPanel: function (sProjectNetworkInternalID, sNetworkActivityInternalID) {

			var sFragmentId = this.getView().createId("activityFragment"),
				oRelationshipsPanel = Fragment.byId(sFragmentId, "relationshipsPanel");
			oRelationshipsPanel.setBusy(true);

			this.getModel().getNetworkActivityRelationship(sProjectNetworkInternalID, sNetworkActivityInternalID).then(function (aResults) {
				var oData = {
					successors: this._filterRelationshipsByIndicator(aResults, CONSTANTS.RELATIONSHIP.SUCCESSOR),
					predecessors: this._filterRelationshipsByIndicator(aResults, CONSTANTS.RELATIONSHIP.PREDECESSOR)
				};
				if (this.getModel(CONSTANTS.MODELS.RELATIONSHIP_MODEL_NAME)) {
					this.getModel(CONSTANTS.MODELS.RELATIONSHIP_MODEL_NAME).setData(oData);
				} else {
					this.setModel(new JSONModel(oData), CONSTANTS.MODELS.RELATIONSHIP_MODEL_NAME);
				}
			}.bind(this)).finally(function () {
				oRelationshipsPanel.setBusy(false);
			});
		},

		/**
		 * Adds activity indicators data to network model.
		 * @param {string} sProjectNetworkInternalID project network ID
		 * @param {string} sNetworkActivityInternalID network activity ID
		 * @private
		 */
		_updateIndicatorsModel: function (sProjectNetworkInternalID, sNetworkActivityInternalID) {
			var sFragmentId = this.getView().createId("activityFragment"),
				oIndicatorsPanel = Fragment.byId(sFragmentId, "indicatorsPanel");
			oIndicatorsPanel.setBusy(true);
			this.getModel().getIndicatorsCounters(sProjectNetworkInternalID, sNetworkActivityInternalID).then(function (oSidePanelCounters) {
				if (this.getModel(CONSTANTS.MODELS.INDICATORS_MODEL_NAME)) {
					this.getModel(CONSTANTS.MODELS.INDICATORS_MODEL_NAME).setData(oSidePanelCounters);
				} else {
					this.setModel(new JSONModel(oSidePanelCounters), CONSTANTS.MODELS.INDICATORS_MODEL_NAME);
				}
				oIndicatorsPanel.setBusy(false);
			}.bind(this)).catch(function (oError) {
				oIndicatorsPanel.setBusy(false);
			});
		},

		/**
		 * Binds activity side panel to the provided node.
		 * @param {string} sProjectNetworkInternalID project network ID
		 * @param {string} sNetworkActivityInternalID network activity ID
		 * @private
		 */
		_bindActivitySplitPane: function (sProjectNetworkInternalID, sNetworkActivityInternalID) {
			var sFragmentId = this.getView().createId("activityFragment"),
				oActivitySidePane = Fragment.byId(sFragmentId, "activitySidePane"),
				sPath = this.getModel().createKey("/C_NtwkActivityGraphOverview", {
					NetworkActivityInternalID: sNetworkActivityInternalID,
					ProjectNetworkInternalID: sProjectNetworkInternalID
				});

			oActivitySidePane.bindElement({
				path: sPath,
				events: {
					dataRequested: function () {
						oActivitySidePane.setBusy(true);
						if (this._fnAfterNavBack) {
							this._oGraph.detachEvent("afterLayouting", this._fnAfterNavBack);
						}
					}.bind(this),
					dataReceived: function () {
						if (this._getSelectedNode() && this._getSelectedNode().getBindingContext("networkViewModel").getProperty("attributes")) {
							this.clearRelationshipState();
							this.getModel().invalidateEntry(oActivitySidePane.getBindingContext());
						}
						this._updateInnerAppState();
						oActivitySidePane.setBusy(false);
					}.bind(this)
				}
			});
		},

		/**
		 * Opens side panel. 
		 * @private
		 */
		_openSidePane: function () {
			var oModel = this._getViewModel(),
				sSize = oModel.getProperty("/sGraphSplitPaneSize");
			if (sSize === "100%") {
				oModel.setProperty("/sGraphSplitPaneSize", "75%");
				oModel.setProperty("/bGraphSplitPaneResizable", true);
			}
			this._getViewModel().setProperty("/bRefocusBtnEnabled", true);
			this._removeGroupHighlight();
		},

		/**
		 * Close button handler. Closes side panel.
		 * @public
		 * @param {string} sFnName name of function that handles side panel close
		 */
		closeSidePane: function (sFnName) {
			this._clearSidePanelsProperties();
			if (sFnName && typeof sFnName === "string") {
				this[sFnName]();
			}
			if (this._fnAfterNavBack) {
				this._oGraph.detachEvent("afterLayouting", this._fnAfterNavBack);
			}

			this._updateInnerAppState();
		},

		/**
		 * Sets view model properties that open side panels to false.
		 * @private
		 */
		_clearSidePanelsProperties: function () {
			var oViewModel = this._getViewModel();
			oViewModel.setProperty("/bConnectorPageVisible", false);
			oViewModel.setProperty("/bActivitySidePaneVisible", false);
			oViewModel.setProperty("/bNetworkPageVisible", false);
			oViewModel.setProperty("/bWbsPaneVisible", false);
			oViewModel.setProperty("/sGraphSplitPaneSize", "100%");
			oViewModel.setProperty("/bGraphSplitPaneResizable", false);
			oViewModel.setProperty("/bRefocusBtnEnabled", false);
		},

		/**
		 * Removes lines selection. 
		 * @public
		 */
		_resetLinesSelection: function () {
			var aLines = this._oGraph.getLines();
			aLines.forEach(function (oLine) {
				oLine.setSelected(false);
			});
		},

		/**
		 * Filters relationships by indicators.
		 * @param {array} aRelationships - relationships data
		 * @param {string} sIndicator - indicator
		 * @returns {array} filtered relationships data
		 * @private
		 */
		_filterRelationshipsByIndicator: function (aRelationships, sIndicator) {
			return aRelationships.filter(function (oRelationship) {
				return oRelationship.SuccessorPredecessorIndicator === sIndicator;
			});
		},

		/**
		 * Opens WBS side panel.
		 * @param {string} sWbs selected WBS name
		 * @public
		 */
		openWbsSplitPane: function (sWbs) {
			this._openSidePane();
			this._setPageVisible("/bWbsPaneVisible");
			this._bindWbsSplitPane(sWbs);
		},

		/**
		 * Binds WBS side panel to depending WBS element.
		 * @param {string} sWbs selected WBS name
		 * @public
		 */
		_bindWbsSplitPane: function (sWbs) {
			var sFragmentId = this.getView().createId("wbsFragment"),
				oWbsSidePane = Fragment.byId(sFragmentId, "wbsSidePane"),
				sPath = this.getModel().createKey("/C_WBSElementGraphOverview", {
					WBSElementExternalID: sWbs,
					Version: ""
				});

			oWbsSidePane.bindElement({
				path: sPath,
				parameters: {
					expand: "to_Project"
				},
				events: {
					dataRequested: function () {
						oWbsSidePane.setBusy(true);
						if (this._fnAfterNavBack) {
							this._oGraph.detachEvent("afterLayouting", this._fnAfterNavBack);
						}
					}.bind(this),
					dataReceived: function () {
						this.getModel().invalidateEntry(oWbsSidePane.getBindingContext());
						this._updateInnerAppState();
						oWbsSidePane.setBusy(false);
					}.bind(this)
				}
			});
		},

		/**
		 * Resets groups statuses to initial.
		 * @private
		 */
		_removeGroupHighlight: function () {
			var oGroups = this._oGraph.getGroups();
			oGroups.forEach(function (oGroup) {
				this._changeGroupStatus(oGroup, ElementStatus.Standard);
			}.bind(this));
		},

		/**
		 * Event handler for activity indicators links press.
		 * @param {string} sPropertyName property that shows to which application link should navigate.
		 * @public
		 */
		onAssignedObjectPress: function (sPropertyName) {
			var oNavigationHandler = new NavigationHandler(this),
				oSelectionVariant = new SelectionVariant(),
				sSemanticObject = CONSTANTS.NAVIGATION[sPropertyName].target.semanticObject,
				sAction = CONSTANTS.NAVIGATION[sPropertyName].target.action,
				oNavigationParameters = {},
				oModel = this.getModel(CONSTANTS.MODELS.INDICATORS_MODEL_NAME),
				sFragmentId = this.getView().createId("activityFragment"),
				oActivitySidePane = Fragment.byId(sFragmentId, "activitySidePane"),
				oActivityPaneObj = oActivitySidePane.getBindingContext().getObject();

			if (sPropertyName === "SUBNETWORKS") {
				var aSubnetworkIds = JSON.parse(oModel.getProperty("/SubnetworkID")),
					aIds = [];
				aSubnetworkIds.forEach(function (sId) {
					aIds.push(sId.SUBNETWORKEXTERNALID);
				});

				oNavigationParameters = {
					ProjectNetwork: aIds
				};

			} else if (sPropertyName === "ACTIVITY_ELEMENTS") {
				oSelectionVariant.addSelectOption("NetworkActivityElement", "E", "EQ", "");
				oSelectionVariant.addSelectOption("ProjectNetwork", "I", "EQ", oActivityPaneObj.ProjectNetwork);
				oSelectionVariant.addSelectOption("NetworkActivity", "I", "EQ", oActivityPaneObj.NetworkActivity);
				oNavigationParameters = oSelectionVariant.toJSONString();

			} else if (sPropertyName === "MATERIAL_COMPONENTS") {
				oSelectionVariant.addSelectOption("ProjectNetwork", "I", "EQ", oActivityPaneObj.ProjectNetwork);
				oSelectionVariant.addSelectOption("NetworkActivity", "I", "EQ", oActivityPaneObj.NetworkActivity);
				oSelectionVariant.addSelectOption("ProductTypeCode", "I", "EQ", "");
				oSelectionVariant.addSelectOption("ProductTypeCode", "I", "EQ", "1");
				oNavigationParameters = oSelectionVariant.toJSONString();
				
			} else if (sPropertyName === "SERVICE_COMPONENTS") {
				oNavigationParameters = {
					ProjectNetwork: oActivityPaneObj.ProjectNetwork,
					NetworkActivity: oActivityPaneObj.NetworkActivity,
					ProductTypeCode: "2"
				};
			} else {
				oNavigationParameters = {
					ProjectNetwork: oActivityPaneObj.ProjectNetwork,
					NetworkActivity: oActivityPaneObj.NetworkActivity
				};
			}

			oNavigationHandler.navigate(sSemanticObject, sAction, oNavigationParameters, {
				customData: this._getInnerAppStateData()
			});
		},

		/**
		 * Saves current app state on smart link popover open.
		 * @param {sap.ui.base.Event} oEvent smart link press event.
		 * @public
		 */
		onBeforePopoverOpens: function (oEvent) {
			this._updateInnerAppState();
			oEvent.getSource()._onBeforePopoverOpens.apply(this, arguments);
		},

		/**
		 * Saves current app state to sap-iapp-state.
		 * @private
		 */
		_updateInnerAppState: function () {
			var oInnerAppData = this._getInnerAppStateData(),
				oAppState = sap.ushell.Container
				.getService("CrossApplicationNavigation")
				.createEmptyAppState(this.getOwnerComponent());
			oAppState.setData({
				customData: oInnerAppData
			});
			oAppState.save();

			var oNavigationHandler = new NavigationHandler(this);
			oNavigationHandler.replaceHash(oAppState.getKey());
		},

		/**
		 * Returns object for current app state.
		 * @private
		 * @returns {object} current app state custom data.
		 */
		_getInnerAppStateData: function () {
			var oViewModel = this._getViewModel(),
				oFocusedControl = this._getFocusedControl(),
				oFocusedControlCtxObj = {};

			if (oFocusedControl && oFocusedControl.getMetadata().getName() === "sap.suite.ui.commons.networkgraph.Group") {
				oFocusedControlCtxObj = oFocusedControl.getBindingContext().getObject();
			} else if (oFocusedControl) {
				oFocusedControlCtxObj = oFocusedControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getObject();
			}
			var oInnerAppStateData = {
				sVisibleSidePane: this._getVisibleSidePane(),
				oFocusedControl: oFocusedControlCtxObj,
				Project: this._sProject,
				ProjectNetwork: this._sProjectNetwork,
				WBSElement: this._sWBSElement,
				ViewKey: oViewModel.getProperty("/sViewKey"),
				LoopDetected: oViewModel.getProperty("/bLoopDetected"),
				GroupKey: oViewModel.getProperty("/sGroupKey"),
				Highlight: oViewModel.getProperty("/oHighlight"),
				ZoomLevel: this._oGraph.getCurrentZoomLevel()
			};
			return oInnerAppStateData;
		},

		/**
		 * Removes selection from all nodes.
		 * @private
		 */
		_removeNodeSelection: function () {
			this._oGraph.getNodes().forEach(function (oNode) {
				oNode.setSelected(false);
			});
		},

		/**
		 * Event handler. Sets or unsets predeccesor/successor highlight.  
		 * @param {sap.ui.base.Event} oEvent toggle button press event.
		 * @public
		 */
		onToggleButtonPress: function (oEvent) {
			var bPressed = oEvent.getParameter("pressed"),
				oButton = oEvent.getSource(),
				oContext = oButton.getBindingContext(CONSTANTS.MODELS.RELATIONSHIP_MODEL_NAME),
				sKey = oContext.getProperty("ProjectNetworkInternalID") + oContext.getProperty("NetworkActivityInternalID"),
				oNodeControl = this._oGraph.getNodeByKey(sKey);
			this._clearSearch();
			this.onResetHighlighting();
			this.clearRelationshipState();
			oButton.setPressed(bPressed);
			this._setNodeStatus(oNodeControl, bPressed);
			this._oGraph.scrollToElement(oNodeControl);
			this._updateMap();
		},

		/**
		 * Sets status predeccesor/successor node.  
		 * @param {sap.suite.ui.commons.networkgraph.Node} oNodeControl predeccesor/successor node control.
		 * @param {boolean} bPressed true if toggle button pressed.
		 * @private
		 */
		_setNodeStatus: function (oNodeControl, bPressed) {
			var sBindingPath = oNodeControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getPath(),
				oContextObj = this._getNetworkModel().getProperty(sBindingPath),
				sStatus;
			if (bPressed) {
				sStatus = this._getFinedNodeStatus(oContextObj, oContextObj.attributes[0]);
			} else {
				sStatus = this._getNodeStatus(oContextObj, oContextObj.attributes[0]);
			}
			this._getNetworkModel().setProperty(sBindingPath + "/nodeStatus", sStatus);
		},

		/**
		 * Unpressed all predeccesor/successor buttons, reset predeccesor/successor highlight.
		 * @public
		 */
		clearRelationshipState: function () {
			this._unpressButtons("predecessorsVBox");
			this._unpressButtons("successorsVBox");
			this._highlightNodes();
		},

		/**
		 * Unpressed all predeccesor/successor buttons.
		 * @param {string} sBoxId id of box with toggle buttons
		 * @private
		 */
		_unpressButtons: function (sBoxId) {
			var sFragmentId = this.getView().createId("activityFragment"),
				aItems = Fragment.byId(sFragmentId, sBoxId).getItems();
			aItems.forEach(function (oItem) {
				oItem.setPressed(false);
			});
		}
	};

});
sap.ui.define([
	"i2d/ps/networkgraph/controller/BaseController",
	"i2d/ps/networkgraph/util/Constants",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/BusyIndicator",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"i2d/ps/networkgraph/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/OverflowToolbarButton",
	"sap/m/OverflowToolbarToggleButton",
	"sap/m/OverflowToolbarLayoutData",
	"sap/m/ButtonType",
	"sap/ui/core/ResizeHandler",
	"sap/ui/core/syncStyleClass",
	"i2d/ps/networkgraph/controller/mixins/SidePanels",
	"i2d/ps/networkgraph/controller/mixins/NodesSearch",
	"i2d/ps/networkgraph/controller/mixins/ComboBoxes",
	"i2d/ps/networkgraph/controller/mixins/DetectLoop",
	"i2d/ps/networkgraph/controller/mixins/Highlight"
], function (BaseController, CONSTANTS, JSONModel, BusyIndicator, Filter, FilterOperator, formatter, Fragment, OverflowToolbarButton,
	OverflowToolbarToggleButton, OverflowToolbarLayoutData, ButtonType, ResizeHandler, syncStyleClass, SidePanelsMixin, NodesSearchMixin,
	ComboBoxesMixin,
	DetectLoopMixin, HighlightMixin) {
	var oNetworkController = BaseController.extend("i2d.ps.networkgraph.controller.Network", $.extend(true, {
			_sProject: "",
			_sProjectNetwork: "",
			_sWBSElement: "",
			_bToggleMapFlag: true,
			formatter: formatter,
			// requests: [],

			/**
			 * Called when the controller is instantiated.
			 * @public 
			 */
			onInit: function () {
				this._oGraph = this.byId("graph");
				this._oMap = this.byId("map");
				this._oSmartFilterBar = this.byId("smartFilterBar");
				this._changeSearchPlaceholder();
				this._hideLegendBtnFromToolbar();
				this._hideStandardFullSceenButton();
				this._insertButtonsInToolbar();
				this._setViewModel();
				this._handleAppState();
				this._oSmartFilterBar.attachAfterVariantLoad(this._onAfterVariantLoad.bind(this));
				this._oSmartFilterBar.attachBeforeVariantSave(this._onBeforeVariantSave.bind(this));
				this._oSmartFilterBar.attachInitialized(this._setInitialFilterData.bind(this));
				this._oGraph.attachGraphReady(this._onGraphReady.bind(this));
				this._oGraph.attachSelectionChange(this._onSelectionChange.bind(this));
				this._oGraph.attachZoomChanged(this._updateInnerAppState.bind(this));
				this._handleNoData([]);
				setTimeout(function () {
					this._loadVHs();
				}.bind(this), 0);
				
				this.getRouter().attachRouteMatched(function(oEvent) {
			        if (!this.oPlaceholderContainer) {
				        this.oPlaceholderContainer = oEvent.getParameter("targetControl");
			        }
				}.bind(this));
			},

			/**
			 * Shows applied filters in filterbar's collapsed mode.
			 * @public
			 */
			onAssignedFiltersChanged: function () {
				var oStatusText = this.byId("statusText");
				if (oStatusText && this._oSmartFilterBar) {
					var sText = this._oSmartFilterBar.retrieveFiltersWithValuesAsText();
					oStatusText.setText(sText);
				}
			},

			/**
			 * Event handler. Saves additional data to variant.
			 * @private
			 * @param {sap.ui.base.Event} oEvent before variant save variant.
			 */
			_onBeforeVariantSave: function (oEvent) {
				var oViewModel = this._getViewModel(),
					sViewKey = oViewModel.getProperty("/sViewKey"),
					sGroupKey = oViewModel.getProperty("/sGroupKey"),
					oHighlight = oViewModel.getProperty("/oHighlight"),
					bLoopDetected = oViewModel.getProperty("/bLoopDetected"),
					oData = this._oSmartFilterBar.getFilterData();
				oData._CUSTOM = {
					sViewKey: sViewKey,
					sGroupKey: sGroupKey,
					oHighlight: oHighlight,
					bLoopDetected: bLoopDetected
				};
				this._oSmartFilterBar.setFilterData(oData, true);
			},

			/**
			 * Event handler. Sets additional data to view model.
			 * @private
			 * @param {sap.ui.base.Event} oEvent after variant load variant.
			 */
			_onAfterVariantLoad: function (oEvent) {
				var oData = this._oSmartFilterBar.getFilterData();
				if (this._hasSavedAppState) {
					this._oSmartFilterBar.setFilterData({
						_CUSTOM: oData._CUSTOM
					}, true);
				} else {
					if (this._hasStartupParameters) {
						this._oSmartFilterBar.setFilterData({
							_CUSTOM: oData._CUSTOM
						}, true);
					}
					var oViewModel = this._getViewModel();
					oViewModel.setProperty("/sViewKey", oData._CUSTOM.sViewKey);
					oViewModel.setProperty("/sGroupKey", oData._CUSTOM.sGroupKey);
					oViewModel.setProperty("/oHighlight", oData._CUSTOM.oHighlight);
					oViewModel.setProperty("/bLoopDetected", oData._CUSTOM.bLoopDetected);
				}
				this._hidePlaceholderOnAppStart();
				this._hasStartupParameters = false;
				this._variantLoaded = true;
			},

			/**
			 * Sets the changed key to the filter data.
			 * @public
			 * @param {string} sPropertyName view model property name.
			 */
			changeFilterData: function (sPropertyName) {
				var vProperty = this._getViewModel().getProperty("/" + sPropertyName),
					oData = this._oSmartFilterBar.getFilterData();
				oData._CUSTOM[sPropertyName] = vProperty;
				this._oSmartFilterBar.setFilterData(oData, true);
			},

			/**
			 * Loads VHs for comboboxes in one batch
			 * @private
			 */
			_loadVHs: function () {
				if (this.byId("viewComboBox") && this.byId("groupComboBox")) {
					var oViewComboBoxBinding = this.byId("viewComboBox").getBinding("items"),
						oGroupComboBoxBinding = this.byId("groupComboBox").getBinding("items");
					oViewComboBoxBinding.resume();
					oGroupComboBoxBinding.resume();
				}
			},

			/**
			 * Initializes graph depending on Project or Network input.
			 * @private
			 */
			_runGraph: function () {
				this._getGraphElements();
			},

			/**
			 * Handler function for graph ready event.
			 * @private
			 */
			_onGraphReady: function () {
				var oViewModel = this._getViewModel(),
					oNetworkModel = this._getNetworkModel(),
					bNoData = oViewModel.getProperty("/bNoGraphData"),
					bLoopDetected = oViewModel.getProperty("/bLoopDetected");

				if (bNoData) {
					oViewModel.setProperty("/bMapVisible", false);
				}

				if (bLoopDetected && oNetworkModel) {
					var aLines = oNetworkModel.getProperty("/lines");
					if (aLines && aLines.length) {
						aLines.forEach(function (oLineData) {
							this._updateLineHoverEvents(oLineData);
						}.bind(this));
					}
				}
				this._removeCollapseButtonInGroups();
				// if (this.oPlaceholderContainer) {
				// 	this.oPlaceholderContainer.hidePlaceholder();
				// }
				setTimeout(function () {
					this._returnFocus();
				}.bind(this), 0);
			},

			/**
			 * Handler function for graph selection change event.
			 * @private
			 */
			_onSelectionChange: function () {
				this._oFocus = this._getSelectedNode();
			},

			/**
			 * Updates filterbar fields depending on startup parameters of Project or Network.
			 * @private
			 */
			_setStartupParameters: function () {
				var oComponentData = this.getOwnerComponent().getComponentData() || {},
					oStartupParameters = oComponentData.startupParameters || {};
				this._sProject = oStartupParameters.ProjectExternalID ? oStartupParameters.ProjectExternalID[0] : "";
				this._sProjectNetwork = oStartupParameters.ProjectNetwork ? oStartupParameters.ProjectNetwork[0] : "";
				this._sWBSElement = oStartupParameters.WBSElementExternalID ? oStartupParameters.WBSElementExternalID[0] : "";
				if (this.isProjectNotEmpty()) {
					this._hasStartupParameters = true;
				}
			},

			/**
			 * Checks previously saved app state after back navigation from external app.
			 * @private
			 */
			_handleAppState: function () {
				var oHashChanger = sap.ui.core.routing.HashChanger.getInstance(),
					sHash = oHashChanger.getHash(),
					sAppStateKey = /(?:sap-iapp-state=)([^&=]+)/.exec(sHash);
				if (sAppStateKey) {
					sap.ushell.Container
						.getService("CrossApplicationNavigation")
						.getAppState(this.getOwnerComponent(), sAppStateKey[1])
						.done(function (oSavedAppState) {
							var oData = oSavedAppState.getData();
							if (oData && oData.customData) {
								this._applyAppStateData(oData.customData);
							}
							this._hasSavedAppState = true;
						}.bind(this));
				} else {
					this._setStartupParameters();
				}
			},

			/**
			 * Applies saved app state data to graph.
			 * @private
			 * @param {object} oAppStateData object with app state data
			 */
			_applyAppStateData: function (oAppStateData) {
				var oViewModel = this._getViewModel();
				this._sProject = oAppStateData.Project;
				this._sProjectNetwork = oAppStateData.ProjectNetwork;
				this._sWBSElement = oAppStateData.WBSElement;
				oViewModel.setProperty("/" + oAppStateData.sVisibleSidePane, true);
				oViewModel.setProperty("/sViewKey", oAppStateData.ViewKey);
				oViewModel.setProperty("/bLoopDetected", oAppStateData.LoopDetected);
				oViewModel.setProperty("/sGroupKey", oAppStateData.GroupKey);
				oViewModel.setProperty("/oHighlight", oAppStateData.Highlight);
				if (this.isProjectNotEmpty()) {
					this._runGraph();
					this._fnAfterNavBack = this._renderGraphAfterNavBack.bind(this, oAppStateData);
					this._oGraph.attachEventOnce("beforeLayouting", this._setZoomLevel.bind(this, oAppStateData.ZoomLevel));
					if (oAppStateData.sVisibleSidePane) {
						this._oGraph.attachEvent("afterLayouting", this._fnAfterNavBack);
						this._oGraph.attachEvent("graphReady", this._refocusPress.bind(this));
					}
				}
			},

			/**
			 * Rerenders graph depending on saved app state.
			 * @private
			 * @param {object} oAppData saved app data after nav back.
			 */
			_renderGraphAfterNavBack: function (oAppData) {
				var sVisibleSidePane = oAppData.sVisibleSidePane,
					oFocusedControl = oAppData.oFocusedControl;

				switch (sVisibleSidePane) {
				case "bConnectorPageVisible":
					this._openElementSidePaneAndRefocus(oFocusedControl, this._getLineControl.bind(this), this.openConnectorSplitPane.bind(this));
					break;
				case "bActivitySidePaneVisible":
					this._openElementSidePaneAndRefocus(oFocusedControl, this._getNodeControl.bind(this), this.openActivitySplitPane.bind(this));
					break;
				case "bNetworkPageVisible":
					this._openGroupSidePaneAndRefocus(oFocusedControl, "ProjectNetwork", this.openNetworkSplitPane.bind(this));
					break;
				case "bWbsPaneVisible":
					this._openGroupSidePaneAndRefocus(oFocusedControl, "WBSElement", this.openWbsSplitPane.bind(this));
					break;
				default:
					return;
				}
			},
			/**
			 * Sets graph zoom level.
			 * @private
			 * @param {float} fZoomLevel zoom level.
			 */
			_setZoomLevel: function (fZoomLevel) {
				this._oGraph.setCurrentZoomLevel(fZoomLevel);
			},

			/**
			 * Opens Network or WBS Side Panel and refocuses to selected group.
			 * @private
			 * @param {object} oFocusedControl focused control data
			 * @param {string} sGroupProperty property for grouping (wbs or network)
			 */
			_openGroupSidePaneAndRefocus: function (oFocusedControl, sGroupProperty) {
				var oGroupControl = this._getGroupControl(oFocusedControl, sGroupProperty);
				if (!oGroupControl) {
					return;
				}

				if (sGroupProperty === "ProjectNetwork") {
					this.openNetworkSplitPane(oFocusedControl[sGroupProperty]);
				} else {
					this.openWbsSplitPane(oFocusedControl[sGroupProperty]);
				}
				this._changeGroupStatus(oGroupControl, "SelectedGroup");
				this._oFocus = oGroupControl;
			},

			/**
			 * Opens Activity or Connector Side Panel and refocuses to selected element.
			 * @private
			 * @param {object} oFocusedControl focused control data
			 * @param {function} fnGetControl function to get control by its data
			 * @param {function} fnOpenSplitPane function to open split pane
			 */
			_openElementSidePaneAndRefocus: function (oFocusedControl, fnGetControl, fnOpenSplitPane) {
				var oControl = fnGetControl(oFocusedControl);
				if (!oControl) {
					return;
				}
				fnOpenSplitPane(oControl);
				this._oFocus = oControl;
			},

			/**
			 * Updates filterbar fields depending on startup parameters of Project or Network.
			 * @private
			 */
			_setInitialFilterData: function () {
				var oFilterData = this._oSmartFilterBar.getFilterData();
				this._oSmartFilterBar.setFilterData({
					ProjectExternalID: oFilterData.ProjectExternalID || this._sProject,
					ProjectNetwork: oFilterData.ProjectNetwork || this._sProjectNetwork,
					WBSElementExternalID: oFilterData.WBSElementExternalID || this._sWBSElement
				});
				if (this.isProjectNotEmpty() && !this._hasSavedAppState && !this._variantLoaded) {
					this._runGraph();
				} else if (!this.isProjectNotEmpty()){
					this._hidePlaceholderOnAppStart();
				}
			},

			/**
			 * Hide default legend button from graph toolbar.
			 * @private
			 */
			_hideLegendBtnFromToolbar: function () {
				var oToolbarContent = this._oGraph.getToolbar().getContent();
				oToolbarContent.find(function (oToolbarItem) {
					return oToolbarItem.isA("sap.m.Button") ? oToolbarItem.getIcon() === "sap-icon://legend" : false;
				}).setVisible(false);
			},

			/**
			 * Hide default full screen from graph toolbar.
			 * @private
			 */
			_hideStandardFullSceenButton: function () {
				var oToolbarContent = this._oGraph.getToolbar().getContent();
				oToolbarContent.find(function (oToolbarItem) {
					return oToolbarItem.isA("sap.m.Button") ? oToolbarItem.getIcon() === "sap-icon://full-screen" : false;
				}).setVisible(false);
			},

			/**
			 * Change search placeholder in graph toolbar.
			 * @private
			 */
			_changeSearchPlaceholder: function () {
				var sPlaceholderText = this.getResourceBundle().getText("SearchActivityPlaceholder");
				this._oGraph._searchField.setPlaceholder(sPlaceholderText);
			},

			/**
			 * Inserts custom buttons and comboboxes into graph toolbar.
			 * @private
			 */
			_insertButtonsInToolbar: function () {
				this._insertFragmentInToolbar("i2d.ps.networkgraph.view.fragments.ViewComboBox", 0);
				this._insertFragmentInToolbar("i2d.ps.networkgraph.view.fragments.GroupComboBox", 1);
				this._insertFragmentInToolbar("i2d.ps.networkgraph.view.fragments.HighlightMenuButton", 2);
				this._insertToggleButton({
					sText: "ToggleGraphMapBtnText",
					sButtonId: "toggleGraphMapButton",
					sTooltip: "ToggleGraphMapBtnTooltip",
					sIcon: "sap-icon://org-chart",
					fnPress: this._toggleGraphMap.bind(this),
					iIndex: 3
				});
				this._insertButton({
					sText: "LegendBtnText",
					sButtonId: "customLegendButton",
					sTooltip: "LegendBtnTooltip",
					sIcon: "sap-icon://legend",
					fnPress: this._legendPress.bind(this),
					iIndex: 4,
					layoutData: new OverflowToolbarLayoutData({
						closeOverflowOnInteraction: false
					}),
					sEnabled: CONSTANTS.MODELS.VIEW_MODEL_NAME + ">/bToolbarBtnsEnabled"
				});
				this._insertFragmentInToolbar("i2d.ps.networkgraph.view.fragments.DetectLoopButton", 5);
				this._insertButton({
					sText: "RefocusBtnText",
					sButtonId: "refocusToolbarButton",
					sTooltip: "RefocusBtnTooltip",
					sIcon: "sap-icon://target-group",
					fnPress: this._refocusPress.bind(this),
					sEnabled: CONSTANTS.MODELS.VIEW_MODEL_NAME + ">/bRefocusBtnEnabled",
					iIndex: 8
				});
				this._insertButton({
					sText: "FullScreenBtnText",
					sButtonId: "fullScreenBtn",
					sTooltip: "FullScreenBtnTooltip",
					sIcon: "sap-icon://full-screen",
					fnPress: this.onFullScreenPress.bind(this),
					sVisible: CONSTANTS.MODELS.VIEW_MODEL_NAME + ">/fullScreenVisible",
					iIndex: 10
				});
				this._insertButton({
					sText: "ExitFullScreenBtnText",
					sButtonId: "exitFullScreenBtn",
					sTooltip: "ExitFullScreenBtnTooltip",
					sIcon: "sap-icon://exit-full-screen",
					fnPress: this.onFullScreenPress.bind(this),
					sVisible: CONSTANTS.MODELS.VIEW_MODEL_NAME + ">/exitFullScreenVisible",
					iIndex: 11
				});
			},

			/**
			 * Inserts fragment into graph toolbar.
			 * @private
			 * @param {string} sId Id of a new fragment.
			 * @param {number} iIndex position of a new fragment in toolbar content.
			 */
			_insertFragmentInToolbar: function (sId, iIndex) {
				var oToolbar = this._oGraph.getToolbar();
				this.createFragment(sId)
					.then(function (oFragment) {
						this.getView().addDependent(oFragment);
						oToolbar.insertContent(oFragment, iIndex);
					}.bind(this));
			},

			/**
			 * Inserts button into graph toolbar.
			 * @private
			 * @param {object} mParameters Map which contains the following parameter properties:
			 * @param {string} mParameters.sButtonId - button Id 
			 * @param {string} mParameters.sText - i18n key for button text
			 * @param {string} mParameters.sTooltip - i18n key for button tooltip text
			 * @param {string} mParameters.sIcon - icon link
			 * @callback mParameters.fnPress - handler function for button press
			 * @param {string} mParameters.sEnabled - path to property binding
			 * @param {string} mParameters.sVisible - path to property binding
			 * @param {number} mParameters.iIndex - position of a new button in toolbar content
			 * @param {sap.m.OverflowToolbarLayoutData} mParameters.layoutData - layout constraints
			 */
			_insertButton: function (mParameters) {
				var oToolbar = this._oGraph.getToolbar(),
					oButton = new OverflowToolbarButton(mParameters.sButtonId, {
						text: this.getResourceBundle().getText(mParameters.sText),
						type: ButtonType.Transparent,
						tooltip: this.getResourceBundle().getText(mParameters.sTooltip),
						icon: mParameters.sIcon,
						press: mParameters.fnPress,
						layoutData: mParameters.layoutData
					});
				if (mParameters.sEnabled) {
					oButton.bindProperty("enabled", mParameters.sEnabled);
				}
				if (mParameters.sVisible) {
					oButton.bindProperty("visible", mParameters.sVisible);
				}
				oToolbar.insertContent(oButton, mParameters.iIndex);
			},

			/**
			 * Inserts toggle button into graph toolbar.
			 * @private
			 * @param {object} mParameters Map which contains the following parameter properties:
			 * @param {string} mParameters.sButtonId - button Id 
			 * @param {string} mParameters.sText - i18n key for button text
			 * @param {string} mParameters.sTooltip - i18n key for button tooltip text
			 * @param {string} mParameters.sIcon - icon link
			 * @callback mParameters.fnPress - handler function for button press
			 * @param {string} mParameters.sEnabled - path to property binding
			 * @param {number} mParameters.iIndex - position of a new button in toolbar content
			 */
			_insertToggleButton: function (mParameters) {
				var oToolbar = this._oGraph.getToolbar(),
					oButton = new OverflowToolbarToggleButton(mParameters.sButtonId, {
						text: this.getResourceBundle().getText(mParameters.sText),
						type: ButtonType.Transparent,
						tooltip: this.getResourceBundle().getText(mParameters.sTooltip),
						icon: mParameters.sIcon,
						press: mParameters.fnPress
					});
				if (mParameters.sEnabled) {
					oButton.bindProperty("enabled", mParameters.sEnabled);
				}
				oToolbar.insertContent(oButton, mParameters.iIndex);
			},

			/**
			 * Changes graph map visibility.
			 * @private
			 */
			_toggleGraphMap: function () {
				var oViewModel = this._getViewModel();

				if (this._bToggleMapFlag) {
					oViewModel.setProperty("/bMapVisible", this._bToggleMapFlag);
					this._oMap.setGraph(this._oGraph);
				} else {
					ResizeHandler.deregister(this._oMap._oResizeListener);
					this._oMap.removeAllAssociation("graph");
					oViewModel.setProperty("/bMapVisible", this._bToggleMapFlag);
				}
				this._bToggleMapFlag = !this._bToggleMapFlag;
			},

			/**
			 * Opens or closes legend popover.
			 * @private
			 * @param {sap.ui.base.Event} oEvent legend button press event.
			 */
			_legendPress: function (oEvent) {
				var oButton = oEvent.getSource();
				if (!this._oLegendPopover) {
					this.createFragment("i2d.ps.networkgraph.view.fragments.LegendPopover").then(function (oFragment) {
						this._oLegendPopover = oFragment;
						this.getView().addDependent(this._oLegendPopover);
						this._oLegendPopover.openBy(oButton);
					}.bind(this));
				} else {
					var bIsOpen = this._oLegendPopover.isOpen();
					if (bIsOpen) {
						this._oLegendPopover.close();
					} else {
						this._oLegendPopover.openBy(oButton);
					}
				}
			},

			/**
			 * Sets view model with initial properties.
			 * @private
			 */
			_setViewModel: function () {
				var oViewModel = new JSONModel({
					sViewKey: CONSTANTS.VIEW_TYPE.BASIC,
					sNoGraphDataText: this.getResourceBundle().getText("NoDataInitialText"),
					bNoGraphData: true,
					bToolbarBtnsEnabled: false,
					bMapVisible: false,
					sGraphSplitPaneSize: "100%",
					bGraphSplitPaneResizable: false,
					bRefocusBtnEnabled: false,
					fullScreenVisible: true,
					exitFullScreenVisible: false,
					oHighlight: {
						bHighlightOn: false,
						sType: "NO_HIGHLIGHT",
						oSelectedRanges: {}
					},
					bLoopDetected: false,
					sGroupKey: CONSTANTS.GROUPING_NAME.NON,
					bConnectorPageVisible: false,
					bActivitySidePaneVisible: false,
					bNetworkPageVisible: false,
					bWbsPaneVisible: false,
					oLegendColors: {
						sBasicCritical: CONSTANTS.LEGEND_COLORS.BASIC_CRITICAL,
						sForecastCritical: CONSTANTS.LEGEND_COLORS.FORECAST_CRITICAL,
						sNonCritical: CONSTANTS.LEGEND_COLORS.NON_CRITICAL,
						sSearch: CONSTANTS.LEGEND_COLORS.SEARCH,
						sRelationship: CONSTANTS.LEGEND_COLORS.RELATIONSHIP,
						sHighlight: CONSTANTS.LEGEND_COLORS.HIGHLIGHT
					}
				});
				this.setModel(oViewModel, CONSTANTS.MODELS.VIEW_MODEL_NAME);
			},

			/**
			 * Getter for view model.
			 * @private
			 * @returns {sap.ui.model.json.JSONModel} view model.
			 */
			_getViewModel: function () {
				return this.getModel(CONSTANTS.MODELS.VIEW_MODEL_NAME);
			},

			/**
			 * Getter for network model.
			 * @private
			 * @returns {sap.ui.model.json.JSONModel} network model.
			 */
			_getNetworkModel: function () {
				return this.getModel(CONSTANTS.MODELS.NETWORK_MODEL_NAME);
			},

			/**
			 * Gets graph nodes, lines and attributes depending on Project and Network values.
			 * @private
			 */
			_getGraphElements: function () {
				var mParameters = {
					sProject: this._sProject,
					sProjectNetwork: this._sProjectNetwork,
					sWBSElement: this._sWBSElement,
					bFillHasPredecessorProperty: false,
					bFillHasSuccessorProperty: false
				};
				BusyIndicator.show(0);
				this._showBusyDialog();
				this.getModel().getNodes(mParameters).then(function (aNodes) {
					this._setNetworkModel(aNodes);
					this._handleNoData(aNodes);
					return this._getLinesAndAttributes(aNodes);
				}.bind(this)).then(function (aResults) {
					this._getNetworkModel().setProperty("/lines", aResults[0]);
					this._clearAttributes();
					this._adaptNetworkModel(aResults[1]);
					this._changeGrouping();
					this._clearSearch();
					BusyIndicator.hide();
					this.onDetectLoopCBSelectionChange(false);
					this._setHighlight();
					this._oGraph.rerender();
					this._oGraph.deselect();
					setTimeout(function () {
						this._closeBusyDialog(false);
						this._hasSavedAppState = false;
					}.bind(this), 0);
				}.bind(this)).catch(function (oError) {
					BusyIndicator.hide();
					this._closeBusyDialog(false);
				}.bind(this)).finally(function () {
					this._hidePlaceholderOnAppStart();
				}.bind(this));
			},

			/**
			 * Set highlighting from variant.
			 * @private
			 */
			_setHighlight: function () {
				var oViewModel = this._getViewModel();
				if (oViewModel.getProperty("/oHighlight/bHighlightOn")) {
					var sType = oViewModel.getProperty("/oHighlight/sType"),
						sTypePath = CONSTANTS.HIGHLIGHT_FILTER[oViewModel.getProperty("/oHighlight/sType")];
					if (sTypePath === CONSTANTS.HIGHLIGHT_FILTER.ADV_HIGHLIGHT) {
						this._advHighlight(oViewModel.getProperty("/oHighlight/oSelectedRanges"), false);
					} else if (sTypePath === CONSTANTS.HIGHLIGHT_FILTER.WO_PREDECESSORS || sTypePath === CONSTANTS.HIGHLIGHT_FILTER.WO_SUCCESSORS) {
						this.onPredSuccHighlightPress(sType);
					} else {
						this.onHighlightPress(sType);
					}
				}
			},

			/**
			 * Sets graph noData property if nodes array is empty.
			 * @private
			 * @param {Array} aNodes array of nodes.
			 */
			_handleNoData: function (aNodes) {
				var oViewModel = this._getViewModel();
				if (aNodes.length) {
					oViewModel.setProperty("/bNoGraphData", false);
					oViewModel.setProperty("/bToolbarBtnsEnabled", true);
				} else {
					var sNoDataText = this.isProjectNotEmpty() ? "NoDataFiltersText" : "NoDataInitialText";
					oViewModel.setProperty("/bNoGraphData", true);
					oViewModel.setProperty("/bToolbarBtnsEnabled", false);
					oViewModel.setProperty("/sNoGraphDataText", this.getResourceBundle().getText(sNoDataText));
				}
			},

			/**
			 * Gets lines and attributes for nodes.
			 * @private
			 * @param {Array} aNodes array of nodes.
			 * @returns {Promise} promise that is resolved when lines and attributes are recieved.
			 */
			_getLinesAndAttributes: function (aNodes) {
				if (aNodes.length) {
					var oModel = this.getModel(),
						oLinesPromise = oModel.getLines(this._getLineFilters(aNodes)),
						oAttributesPromise = oModel.getAttributes(this._getAttributesFilters(aNodes));
					return Promise.all([oLinesPromise, oAttributesPromise]);
				} else {
					return Promise.reject();
				}
			},

			/**
			 * Sets attributes to view model to corresponding node depending on its type.
			 * @private
			 * @param {Array} aAttributes array of attributes.
			 */
			_adaptNetworkModel: function (aAttributes) {
				var oModel = this._getNetworkModel(),
					aNodes = oModel.getProperty("/nodes");

				aAttributes.forEach(function (oAttribute) {
					var oNode = aNodes.find(function (node) {
						return node.ProjectNetworkInternalID === oAttribute.ProjectNetworkInternalID && node.NetworkActivityInternalID ===
							oAttribute
							.NetworkActivityInternalID;
					});
					if (!oNode.attributes) {
						oNode.attributes = [];
						oNode.staticAttributes = {};
					}
					oNode = this._getNormalizedNode(oNode, oAttribute);
					oNode.nodeStatus = this._getNodeStatus(oNode, oAttribute);
				}.bind(this));
				oModel.setProperty("/nodes", aNodes);
			},

			/**
			 * Sets node status depending on critical type.
			 * @private
			 * @param {Object} oNode object from view model with node properties.
			 * @param {Array} oAttribute object with attribute properties.
			 * @returns {Object} node updated with corresponding status.
			 */
			_getNodeStatus: function (oNode, oAttribute) {
				if (oAttribute.CriticalType === CONSTANTS.CRITICAL_TYPES.BASIC) {
					return oNode.IsCriticalBasic ? CONSTANTS.NODE_STATUS.BASIC_CRITICAL : CONSTANTS.NODE_STATUS.NON_CRITICAL;
				} else {
					return oNode.IsCriticalForecast ? CONSTANTS.NODE_STATUS.FORECAST_CRITICAL : CONSTANTS.NODE_STATUS.NON_CRITICAL;
				}
			},

			/**
			 * Sets fined node status depending on critical type.
			 * @private
			 * @param {Object} oNode object from view model with node properties.
			 * @param {Array} oAttribute object with attribute properties.
			 * @returns {Object} node updated with corresponding status.
			 */
			_getFinedNodeStatus: function (oNode, oAttribute) {
				if (oAttribute.CriticalType === CONSTANTS.CRITICAL_TYPES.BASIC) {
					return oNode.IsCriticalBasic ? CONSTANTS.NODE_STATUS.BASIC_FINDED_CRITICAL : CONSTANTS.NODE_STATUS.FINDED;
				} else {
					return oNode.IsCriticalForecast ? CONSTANTS.NODE_STATUS.FORECAST_FINDED_CRITICAL : CONSTANTS.NODE_STATUS.FINDED;
				}
			},

			/**
			 * Sets highlighted node status depending on critical type.
			 * @private
			 * @param {Object} oNode object from view model with node properties.
			 * @param {Array} oAttribute object with attribute properties.
			 * @returns {Object} node updated with corresponding status.
			 */
			_getHighlightedNodeStatus: function (oNode, oAttribute) {
				if (oAttribute.CriticalType === CONSTANTS.CRITICAL_TYPES.BASIC) {
					return oNode.IsCriticalBasic ? CONSTANTS.NODE_STATUS.BASIC_HIGHLIGHT_CRITICAL : CONSTANTS.NODE_STATUS.HIGHLIGHT;
				} else {
					return oNode.IsCriticalForecast ? CONSTANTS.NODE_STATUS.FORECAST_HIGHLIGHT_CRITICAL : CONSTANTS.NODE_STATUS.HIGHLIGHT;
				}
			},

			/**
			 * Sorts attribute depending on it type and adding to node object.
			 * @private
			 * @param {Object} oNode object from view model with node properties.
			 * @param {Array} oAttribute object with attribute properties.
			 * @returns {Object} node updated with corresponding attributes.
			 */
			_getNormalizedNode: function (oNode, oAttribute) {
				switch (oAttribute.AttributeTitle) {
				case CONSTANTS.ATTRIBUTES.HAS_DOCUMENT:
					oNode.staticAttributes.document = oAttribute;
					return oNode;
				case CONSTANTS.ATTRIBUTES.HAS_ELEMENT:
					oNode.staticAttributes.element = oAttribute;
					return oNode;
				case CONSTANTS.ATTRIBUTES.HAS_MATERIAL:
					oNode.staticAttributes.material = oAttribute;
					return oNode;
				case CONSTANTS.ATTRIBUTES.HAS_SERVICE:
						oNode.staticAttributes.service = oAttribute;
						return oNode;
				case CONSTANTS.ATTRIBUTES.HAS_MILESTONE:
					oNode.staticAttributes.milestone = oAttribute;
					return oNode;
				case CONSTANTS.ATTRIBUTES.HAS_SUBNETWORK:
					oNode.staticAttributes.subnetwork = oAttribute;
					return oNode;
				default:
					oNode.attributes.push(oAttribute);
					return oNode;
				}
			},

			/**
			 * Creates filter for attributes request depending on view type.
			 * @private
			 * @param {Array} aNodes array of nodes.
			 * @returns {sap.ui.model.Filter} filter for attributes.
			 */
			_getAttributesFilters: function (aNodes) {
				var sViewKey = this._getViewModel().getProperty("/sViewKey"),
					aAttributesFilters = [];
				aNodes.forEach(function (oNode) {
					aAttributesFilters.push(new Filter("NetworkActivityObject", FilterOperator.EQ, oNode.NetworkActivityObject));
				});
				return [new Filter({
					filters: [
						new Filter("ViewType", FilterOperator.EQ, sViewKey),
						new Filter({
							filters: aAttributesFilters
						})
					],
					and: true
				})];
			},

			/**
			 * Creates filter for lines request.
			 * @private
			 * @param {Array} aNodes array of nodes.
			 * @returns {Array} filter for lines.
			 */
			_getLineFilters: function (aNodes) {
				var aPredecessorFilters = [],
					aSuccessorFilters = [];
				aNodes.forEach(function (oNode) {
					aPredecessorFilters.push(new Filter({
						filters: [new Filter("PredecessorProjNtwkIntID", FilterOperator.EQ, oNode.ProjectNetworkInternalID),
							new Filter("PredecessorNtwkActyIntID", FilterOperator.EQ, oNode.NetworkActivityInternalID)
						],
						and: true
					}));

					aSuccessorFilters.push(new Filter({
						filters: [new Filter("SuccessorProjNtwkIntID", FilterOperator.EQ, oNode.ProjectNetworkInternalID),
							new Filter("SuccessorNtwkActyIntID", FilterOperator.EQ, oNode.NetworkActivityInternalID)
						],
						and: true
					}));
				});

				return [new Filter({
					filters: [new Filter({
						filters: aPredecessorFilters
					}), new Filter({
						filters: aSuccessorFilters
					})],
					and: true
				})];
			},

			/**
			 * Returns array of unique filters by given properties.
			 * @private
			 * @param {Array} aFilterData array of filter data with proprty name.
			 * @param {boolean} bExcludeEmptyValues flag to exclude empty filter or not.
			 * @returns {Array} array of filters.
			 */
			_getUniqueFiltersByProperties: function (aFilterData, bExcludeEmptyValues) {
				var aAllFilters = [],
					aUniqueNodes = this._getUniqueNodesByProperties(aFilterData);
				aUniqueNodes.forEach(function (oNode) {
					var aPropertyFilters = [];
					aFilterData.forEach(function (oFilterData) {
						if (!bExcludeEmptyValues || oNode[oFilterData.sPropertyName]) {
							aPropertyFilters.push(new Filter(oFilterData.sFilterPropertyName, FilterOperator.EQ, oNode[oFilterData.sPropertyName]));
						}
					});

					if (!bExcludeEmptyValues || aPropertyFilters.length) {
						aAllFilters.push(new Filter({
							filters: aPropertyFilters,
							and: true
						}));
					}

				});

				return aAllFilters;
			},

			/**
			 * Returns array of unique nodes by given properties.
			 * @private
			 * @param {Array} aFilterData array of filter data with proprty name.
			 * @returns {Array} array of unique nodes.
			 */
			_getUniqueNodesByProperties: function (aFilterData) {
				var aNodes = this._getNetworkModel().getProperty("/nodes");
				return aNodes.reduce(function (aUniqueNodes, oNode) {
					var bDublicate = aUniqueNodes.some(function (el) {
						return aFilterData.every(function (oFilterData) {
							return el[oFilterData.sPropertyName] === oNode[oFilterData.sPropertyName];
						});
					});
					if (!bDublicate) {
						aUniqueNodes.push(oNode);
					}
					return aUniqueNodes;
				}, []);
			},

			/**
			 * Sets network view model with nodes and lines data.
			 * @private
			 * @param {Array} aNodes array of nodes.
			 */
			_setNetworkModel: function (aNodes) {
				var oModel = this._getNetworkModel(),
					oData = {
						nodes: aNodes
					};
				if (oModel) {
					oModel.setData(oData);
				} else {
					oModel = new JSONModel(oData, false);
					oModel.setSizeLimit(CONSTANTS.SIZE_LIMIT);
					this.setModel(oModel, CONSTANTS.MODELS.NETWORK_MODEL_NAME);
				}
			},

			/**
			 * Event handler for filterbar search event.
			 * Runs graph depending on Project and Network values.
			 * @public
			 * @param {sap.ui.base.Event} oEvent filterbar search event. 
			 */
			onGoButtonPress: function (oEvent) {
				var oFilterData = oEvent.getSource().getFilterData();
				this._sProject = oFilterData.ProjectExternalID || "";
				this._sProjectNetwork = oFilterData.ProjectNetwork || "";
				this._sWBSElement = oFilterData.WBSElementExternalID || "";
				if (!this._hasSavedAppState) {
					if (this.isProjectNotEmpty()) {
						this._runGraph();
						this._updateInnerAppState();
					} else {
						this.closeSidePane();
						this._handleNoData([]);
					}
				}
				oEvent.bPreventDefault = false;
			},

			/**
			 * Event handler for showing busy dialog.
			 * @public
			 */
			_showBusyDialog: function () {
				if (!this._oBusyDialog) {
					this._oBusyDialog = Fragment.load({
						name: "i2d.ps.networkgraph.view.fragments.BusyDialog",
						controller: this
					}).then(function (oBusyDialog) {
						this.getView().addDependent(oBusyDialog);
						syncStyleClass("sapUiSizeCompact", this.getView(), oBusyDialog);
						return oBusyDialog;
					}.bind(this));
				}

				this._oBusyDialog.then(function (oBusyDialog) {
					this._oBusyDialogTimeout = setTimeout(function () { // eslint-disable-line sap-timeout-usage
						oBusyDialog.open();
					}, CONSTANTS.BUSY_DIALOG_OPEN_TIMEOUT);
				}.bind(this));
			},

			/**
			 * Event handler for closing busy dialog.
			 * Aborts pending requests.
			 * @public
			 * @param {sap.ui.base.Event} oEvent dialog close event. 
			 */
			onCloseBusyDialog: function (oEvent) {
				if (oEvent.getParameter("cancelPressed")) {
					this.closeSidePane();
					this._clearFilters();
					this._handleNoData([]);
					this._updateInnerAppState();
					this._closeBusyDialog(true);
				}
			},

			/**
			 * Closes busy dialog.
			 * Clears busy dialog timeout and aborts requests.
			 * @private
			 * @param {boolean} bIsAbortRequired - wether requests have to be stopped
			 */
			_closeBusyDialog: function (bIsAbortRequired) {
				clearTimeout(this._oBusyDialogTimeout);
				this._oBusyDialog.then(function (oBusyDialog) {
					if (bIsAbortRequired) {
						this._stopPendingRequests();
					}
					setTimeout(function () { // eslint-disable-line sap-timeout-usage
						oBusyDialog.close();
					}, CONSTANTS.BUSY_DIALOG_CLOSE_TIMEOUT);
				}.bind(this));
			},

			/**
			 * Stops all pending requests.
			 * @private
			 */
			_stopPendingRequests: function () {
				if ("stop" in window) {
					window.stop();
				} else {
					this.getOwnerComponent().requests.forEach(function (oRequest) {
						oRequest.abort();
					});
				}
			},

			/**
			 * Clears all filterbar values.
			 * @private
			 */
			_clearFilters: function () {
				var oViewModel = this._getViewModel();
				this._sProject = "";
				this._sProjectNetwork = "";
				this._sWBSElement = "";
				this._oSmartFilterBar.setFilterData({
					ProjectExternalID: this._sProject,
					ProjectNetwork: this._sProjectNetwork,
					WBSElementExternalID: this._sWBSElement
				});
				oViewModel.setProperty("/sViewKey", CONSTANTS.VIEW_TYPE.BASIC);
				oViewModel.setProperty("/sGroupKey", CONSTANTS.GROUPING_NAME.NON);
				oViewModel.setProperty("/oHighlight", {
					bHighlightOn: false,
					sType: "NO_HIGHLIGHT",
					oSelectedRanges: {}
				});
				oViewModel.setProperty("/bLoopDetected", false);
			},

			/**
			 * Event handler for line press.
			 * Opens Connector side panel.
			 * @public
			 * @param {sap.ui.base.Event} oEvent line press event. 
			 */
			onLinePress: function (oEvent) {
				var oLine = oEvent.getSource();
				this._deselectNodes();
				this._deselectLines(oLine);
				if (oLine.getSelected()) {
					this.openConnectorSplitPane(oLine);
				}
				this._updateMap();
				oEvent.bPreventDefault = true;
			},

			/**
			 * Updates graph map.
			 * @private
			 */
			_updateMap: function () {
				if (this._oMap.getVisible()) {
					this._oMap.setGraph(this._oGraph);
				}
			},

			/**
			 * Event handler for node press.
			 * Opens Activity side panel.
			 * @public
			 * @param {sap.ui.base.Event} oEvent node press event. 
			 */
			onNodePress: function (oEvent) {
				var oNode = oEvent.getSource();
				this._deselectNodes(oNode);
				this._deselectLines();
				if (!oNode.getSelected()) {
					this.openActivitySplitPane(oNode);
				}
				this._updateMap();
			},

			/**
			 * Event handler for refocus button press.
			 * @public
			 * @param {sap.ui.base.Event} oEvent refocus button press event. 
			 */
			_refocusPress: function () {
				var oGraphFocus = this._oGraph.getFocus(),
					oSidePanelControl = this._getFocusedControl() || this._oFocus;
				if (!oGraphFocus && !oSidePanelControl) {
					return;
				}
				this._oGraph.scrollToElement(oSidePanelControl ? oSidePanelControl : oGraphFocus.item);

			},

			/**
			 * Returns focused element depending on opened side panel.
			 * @private
			 * @returns {(sap.suite.ui.commons.networkgraph.Group|sap.suite.ui.commons.networkgraph.Node|sap.suite.ui.commons.networkgraph.Line)} currently focused graph element
			 */
			_getFocusedControl: function () {
				var sVisiblePane = this._getVisibleSidePane();

				switch (sVisiblePane) {
				case "bNetworkPageVisible":
					var oNetworkGroupData = this._getSidePanelBindingObject("network");
					if (!oNetworkGroupData) {
						return null;
					}
					var oNetworkGroupControl = this._getGroupControl(oNetworkGroupData, "ProjectNetwork");
					return oNetworkGroupControl;

				case "bConnectorPageVisible":
					var oConnectorData = this._getSidePanelBindingObject("connector");
					if (!oConnectorData) {
						return null;
					}
					var oLineControl = this._getLineControl(oConnectorData);
					oLineControl.setSelected(true);
					return oLineControl;

				case "bActivitySidePaneVisible":
					var oActivityData = this._getSidePanelBindingObject("activity");
					if (!oActivityData) {
						return null;
					}
					var oActivityControl = this._getNodeControl(oActivityData);
					oActivityControl.setSelected(true);
					return oActivityControl;

				case "bWbsPaneVisible":
					var oWbsGroupData = this._getSidePanelBindingObject("wbs");
					if (!oWbsGroupData) {
						return null;
					}
					oWbsGroupData.WBSElement = oWbsGroupData.WBSElementExternalID;
					var oWbsGroupControl = this._getGroupControl(oWbsGroupData, "WBSElement");
					return oWbsGroupControl;

				default:
					return null;
				}
			},

			/**
			 * Returns visibility property name of side panel which is now visible.
			 * @private
			 * @returns {string} property name
			 */
			_getVisibleSidePane: function () {
				var oViewModel = this._getViewModel(),
					aProperties = ["bNetworkPageVisible", "bConnectorPageVisible", "bActivitySidePaneVisible", "bWbsPaneVisible"];
				return aProperties.find(function (sProperty) {
					return oViewModel.getProperty("/" + sProperty);
				});
			},

			/**
			 * Returns side panel context object.
			 * @private
			 * @param {string} sElementName name of side panel
			 * @returns {object} context object 
			 */
			_getSidePanelBindingObject: function (sElementName) {
				var sFragmentId = this.getView().createId(sElementName + "Fragment"),
					oSidePane = Fragment.byId(sFragmentId, sElementName + "SidePane"),
					oSidePaneCtx = oSidePane.getBindingContext();
				return oSidePaneCtx ? oSidePaneCtx.getObject() : null;
			},

			/**
			 * Returns group control by group data.
			 * @private
			 * @param {object} oGroupData group data
			 * @param {string} sPropertyName group type
			 * @returns {sap.suite.ui.commons.networkgraph.Group} group control
			 */
			_getGroupControl: function (oGroupData, sPropertyName) {
				var aGroups = this._oGraph.getGroups();
				return aGroups.find(function (oGroupControl) {
					var oGroupControlData = oGroupControl.getBindingContext().getObject();
					return oGroupControlData[sPropertyName] === oGroupData[sPropertyName];
				});
			},

			/**
			 * Returns line control by line data.
			 * @private
			 * @param {object} oLineData line data
			 * @returns {sap.suite.ui.commons.networkgraph.Line} line control
			 */
			_getLineControl: function (oLineData) {
				var aLines = this._oGraph.getLines();

				return aLines.find(function (oLineControl) {
					var oLineControlContext = oLineControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getObject();

					return oLineControlContext.PredecessorProjNtwkIntID === oLineData.PredecessorProjNtwkIntID &&
						oLineControlContext.PredecessorNtwkActyIntID === oLineData.PredecessorNtwkActyIntID &&
						oLineControlContext.SuccessorProjNtwkIntID === oLineData.SuccessorProjNtwkIntID &&
						oLineControlContext.SuccessorNtwkActyIntID === oLineData.SuccessorNtwkActyIntID &&
						oLineControlContext.NetworkActivityRelationType === oLineData.NetworkActivityRelationType; 
				});
			},

			/**
			 * Returns node control by activity data.
			 * @private
			 * @param {object} oActivityData activity data
			 * @returns {sap.suite.ui.commons.networkgraph.Node} node control
			 */
			_getNodeControl: function (oActivityData) {
				return this._oGraph.getNodeByKey(oActivityData.ProjectNetworkInternalID + oActivityData.NetworkActivityInternalID);
			},

			/**
			 * Opens or closes share popover.
			 * @public
			 * @param {sap.ui.base.Event} oEvent share button press event.
			 */
			openSharePopover: function (oEvent) {
				var oButton = oEvent.getSource();
				if (!this._oSharePopover) {
					this.createFragment("i2d.ps.networkgraph.view.fragments.SharePopover").then(function (oFragment) {
						this._oSharePopover = oFragment;
						this.getView().addDependent(this._oSharePopover);
						this._oSharePopover.openBy(oButton);
					}.bind(this));
				} else {
					var bIsOpen = this._oSharePopover.isOpen();
					if (bIsOpen) {
						this._oSharePopover.close();
					} else {
						this._oSharePopover.openBy(oButton);
					}
				}
			},

			/**
			 * Deselect all lines except the current one.
			 * @private
			 * @param {sap.suite.ui.commons.networkgraph.Line|undefined} oCurrentLine line control.
			 */
			_deselectLines: function (oCurrentLine) {
				this._oGraph.getLines().forEach(function (oLine) {
					if (oCurrentLine !== oLine) {
						oLine.setSelected(false);
					}
				});
			},

			/**
			 * Deselect all nodes except the current one.
			 * @private
			 * @param {sap.suite.ui.commons.networkgraph.Node|undefined} oCurrentNode node control.
			 */
			_deselectNodes: function (oCurrentNode) {
				this._oGraph.getNodes().forEach(function (oNode) {
					if (oCurrentNode !== oNode) {
						oNode.setSelected(false);
					}
				});
			},

			/**
			 * Full screen press event handler.
			 * @public
			 */
			onFullScreenPress: function () {
				var oViewModel = this._getViewModel(),
					bVisible = this._getViewModel().getProperty("/fullScreenVisible");
				oViewModel.setProperty("/fullScreenVisible", !bVisible);
				oViewModel.setProperty("/exitFullScreenVisible", bVisible);
			},

			/**
			 * Checks wether filterbar fields are not empty and project is selected.
			 * @public
			 * @returns {boolean} wether project is not empty.
			 */
			isProjectNotEmpty: function () {
				return this._sProject || this._sProjectNetwork || this._sWBSElement;
			},
		
			/**
			 * Checks if default variant without preloaded data is selected
			 * If yes: hide the placehoder screen
			 * @public
			 */
			_hidePlaceholderOnAppStart: function() {
				// check if the filter bar is initialied
				if (!this._oSmartFilterBar.isInitialised()) {
					return;
				}	
				if (this.oPlaceholderContainer) {
					this.oPlaceholderContainer.hidePlaceholder();
				}			
			}
		},
		SidePanelsMixin,
		NodesSearchMixin,
		ComboBoxesMixin,
		DetectLoopMixin,
		HighlightMixin));
	return oNetworkController;
});
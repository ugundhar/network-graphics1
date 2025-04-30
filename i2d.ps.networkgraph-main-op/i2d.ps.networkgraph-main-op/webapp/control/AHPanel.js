sap.ui.define([
	"i2d/ps/networkgraph/control/AHConditionPanel",
	"sap/m/P13nFilterPanel",
	"sap/m/Panel",
	"sap/m/P13nOperationsHelper"
], function (AHConditionPanel, P13nFilterPanel, Panel, P13nOperationsHelper) {
	"use strict";

	/**
	 * Constructor for a new AHPanel.
	 * @extends sap.m.P13nFilterPanel
	 * @constructor i2d.ps.networkgraph.control.AHPanel
	 * @public
	 */
	var AHPanel = P13nFilterPanel.extend("i2d.ps.networkgraph.control.AHPanel", {
		metadata: {
			properties: {
				/**
				 * Defines the maximum number of include filters.
				 */
				maxIncludes: {
					type: "int",
					group: "Misc",
					defaultValue: -1
				},

				/**
				 * Title text appears in the Dialog header.
				 */
				panelTitle: {
					type: "string",
					group: "Appearance",
					defaultValue: "null"
				},

				/**
				 * Defines if the <code>mediaQuery</code> or a <code>ContainerResize</code> is used for layout update. If the
				 * <code>ConditionPanel</code> is used in a dialog, the property must be set to <code>true</code>.
				 */
				containerQuery: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},

				/**
				 * Can be used to control the layout behavior. Default is "" which will automatically change the layout. With "Desktop", "Table"
				 * or"Phone" you can set a fixed layout.
				 */
				layoutMode: {
					type: "string",
					group: "Misc",
					defaultValue: ""
				},

				/**
				 * Should empty operation be enabled for certain data types. This is also based on their nullable setting.
				 */
				enableEmptyOperations: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				}
			},
			aggregations: {
				/**
				 * Contains content for panels.
				 */
				content: {
					type: "sap.ui.core.Control",
					multiple: true,
					singularName: "content",
					visibility: "hidden"
				}
			},
			events: {
				/**
				 * Event raised if a filter item has been changed. reason can be added, updated or removed.
				 */
				filterItemChanged: {
					parameters: {
						/**
						 * reason for the changeFilterItem event. Value can be added, updated or removed.
						 */
						reason: {
							type: "string"
						},
						/**
						 * key of the changed filterItem
						 */
						key: {
							type: "string"
						},
						/**
						 * index of the changed filterItem
						 */
						index: {
							type: "int"
						},
						/**
						 * JSON object of the changed filterItem instance (in case of reason=="removed" the itemData parameter does not exist)
						 */
						itemData: {
							type: "object"
						}
					}
				}
			}
		},
		renderer: {
			apiVersion: 2,
			render: function (oRm, oControl) {
				oRm.openStart("section", oControl);
				oRm.class("sapMFilterPanel");
				oRm.openEnd();

				oRm.openStart("div");
				oRm.class("sapMFilterPanelContent");
				oRm.class("sapMFilterPanelBG");
				oRm.openEnd();

				oControl.getAggregation("content").forEach(function (oChildren) {
					oRm.renderControl(oChildren);
				});

				oRm.close("div");
				oRm.close("section");
			}
		}
	});

	/**
	 * Initializes the control.
	 * @public
	 */
	AHPanel.prototype.init = function () {
		this._aKeyFields = [];
		this._aIncludeOperations = {};
		this._oPanel = new Panel({
			expanded: true,
			expandable: true,
			headerText: this.getPanelTitle(),
			width: "auto"
		}).addStyleClass("sapMFilterPadding");
		var sFilterPanelId = this.getId().indexOf("datesPanel") >= 0 ? "dates" : "masterData";
		this._oFilterPanel = new AHConditionPanel(sFilterPanelId, {
			maxConditions: this.getMaxIncludes(),
			alwaysShowAddIcon: false,
			layoutMode: this.getLayoutMode(),
			dataChange: this.handleDataChange.bind(this)
		});
		this._oFilterPanel._sAddRemoveIconTooltipKey = "FILTER";

		this._oPanel.addContent(this._oFilterPanel);
		this.addAggregation("content", this._oPanel);

		if (!this._oOperationsHelper) {
			this._oOperationsHelper = new P13nOperationsHelper();
		}
		this._updateOperations();
	};

	/**
	 * Sets panel title.
	 * @param {string} sPanelTitle panel title.
	 * @returns {i2d.ps.networkgraph.control.AHPanel} AHPanel control
	 * @public
	 */
	AHPanel.prototype.setPanelTitle = function (sPanelTitle) {
		this.setProperty("panelTitle", sPanelTitle);
		this._oPanel.setHeaderText(sPanelTitle);
		return this;
	};

	/**
	 * Setter for the supported Include operations array.
	 * @param {sap.m.P13nConditionOperation[]} aOperation array of operations
	 * @param {string} sFilterType type for which the operations are defined
	 * @public
	 */
	AHPanel.prototype.setIncludeOperations = function (aOperation, sFilterType) {
		var sType = sFilterType || "default";
		this._aIncludeOperations[sType] = aOperation;
		if (this._oFilterPanel) {
			this._oFilterPanel.setOperations(this._aIncludeOperations[sType], sType);
		}
	};

	/**
	 * Setter for container query.
	 * @param {boolean} bContainerQuery if the media query or container resize is used for layout update
	 * @returns {i2d.ps.networkgraph.control.AHPanel} AHPanel control
	 * @public
	 */
	AHPanel.prototype.setContainerQuery = function (bContainerQuery) {
		this.setProperty("containerQuery", bContainerQuery);
		this._oFilterPanel.setContainerQuery(bContainerQuery);
		return this;
	};

	/**
	 * Setter for maximum number of filters.
	 * @param {string} sMax maximum number of filters
	 * @returns {i2d.ps.networkgraph.control.AHPanel} AHPanel control
	 * @public
	 */
	AHPanel.prototype.setMaxIncludes = function (sMax) {
		this.setProperty("maxIncludes", sMax);

		if (this._oFilterPanel) {
			this._oFilterPanel.setMaxConditions(sMax);
		}
		return this;
	};

	/**
	 * Setter for a KeyFields array.
	 * @param {array} aKeyFields array of KeyFields
	 * @public
	 */
	AHPanel.prototype.setKeyFields = function (aKeyFields) {
		this._aKeyFields = aKeyFields;
		if (this._oFilterPanel) {
			this._oFilterPanel.setKeyFields(aKeyFields);
		}
	};

	/**
	 * Update the operations list.
	 * @private
	 */
	AHPanel.prototype._updateOperations = function () {
		this._oOperationsHelper.getIncludeTypes().forEach(function (sType) {
			this.setIncludeOperations(this._oOperationsHelper.getIncludeOperationsByType(sType), sType);
		}.bind(this));
		this.setIncludeOperations(["EQ"], "multi");
	};

	/**
	 * Checks if the entered and modified conditions are correct.
	 * @returns {boolean} true if all conditions are valid, false otherwise.
	 * @public
	 */
	AHPanel.prototype.validateConditions = function () {
		return this._oFilterPanel.validateConditions();
	};

	/**
	 * Sets the array of conditions.
	 * @param {object[]} aConditions the complete list of conditions
	 * @public
	 */
	AHPanel.prototype.setConditions = function (aConditions) {
		this._oFilterPanel.setConditions(aConditions);
	};

	/**
	 * Event handler for data change.Fire Item change event with range object.
	 * @param {sap.ui.base.Event} oEvent data change event.
	 * @public
	 */
	AHPanel.prototype.handleDataChange = function (oEvent) {
		var oNewData = oEvent.getParameter("newData"),
			sOperation = oEvent.getParameter("operation"),
			sKey = oEvent.getParameter("id") + "-" + oEvent.getParameter("key"),
			iConditionIndex = oEvent.getParameter("index"),
			iIndex = -1;

		switch (sOperation) {
		case "update":
			this.fireFilterItemChanged({
				reason: "updated",
				key: sKey,
				index: iIndex,
				itemData: {
					columnKey: oNewData.keyField,
					operation: oNewData.operation,
					exclude: oNewData.exclude,
					value1: oNewData.value1,
					value2: oNewData.value2
				}
			});
			break;
		case "add":
			if (iConditionIndex >= 0) {
				iIndex++;
			}
			this.fireFilterItemChanged({
				reason: "added",
				key: sKey,
				index: iIndex,
				itemData: {
					columnKey: oNewData.keyField,
					operation: oNewData.operation,
					exclude: oNewData.exclude,
					value1: oNewData.value1,
					value2: oNewData.value2
				}
			});
			break;
		case "remove":
			this.fireFilterItemChanged({
				reason: "removed",
				key: sKey,
				index: iIndex
			});
			break;
		}

	};

	return AHPanel;

});
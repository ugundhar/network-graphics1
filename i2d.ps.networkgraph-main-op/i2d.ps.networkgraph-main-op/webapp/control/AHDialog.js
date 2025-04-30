sap.ui.define([
	"sap/m/Dialog",
	"sap/m/VBox",
	"sap/m/DialogRenderer",
	"sap/m/FlexItemData",
	"sap/m/Button",
	"sap/m/ButtonType",
	"sap/m/OverflowToolbarLayoutData",
	"sap/m/OverflowToolbarPriority",
	"sap/ui/layout/Grid",
	"i2d/ps/networkgraph/control/AHPanel",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"i2d/ps/networkgraph/util/Constants"
], function (Dialog, VBox, DialogRenderer, FlexItemData, Button, ButtonType, OverflowToolbarLayoutData, OverflowToolbarPriority, Grid,
	AHPanel, MessageBox, JSONModel, CONSTANTS) {
	"use strict";

	/**
	 * Constructor for a new AHDialog.
	 * @extends sap.m.Dialog
	 * @constructor i2d.ps.networkgraph.control.AHDialog
	 * @public
	 */
	var AHDialog = Dialog.extend("i2d.ps.networkgraph.control.AHDialog", {
		metadata: {
			properties: {
				/**
				 * Defines the maximum number of include ranges.
				 */
				maxIncludeRanges: {
					type: "int",
					group: "Misc",
					defaultValue: -1
				},

				/**
				 * Entity type on which dialog is based.
				 */
				entityType: {
					type: "string",
					group: "Misc",
					defaultValue: ""
				}
			},
			aggregations: {

			},
			events: {
				/**
				 * This event is fired when the OK button is pressed.
				 */
				ok: {},

				/**
				 * This event is fired when the Cancel button is pressed.
				 */
				cancel: {}
			}
		},
		renderer: DialogRenderer.render
	});

	/**
	 * Initial initializes the control.
	 * @public
	 */
	AHDialog.prototype.init = function () {
		Dialog.prototype.init.apply(this);
		this.setHorizontalScrolling(false);
		this.setContentWidth("70rem");
		this.setContentHeight("40rem");
		this.setDraggable(true);
		this.setResizable(true);
		this.addStyleClass("compValueHelpDialog");
		this.setTitleAlignment("Center");
		this._oVBox = new VBox(this.getId() + "-vbox", {
			fitContainer: true
		});
		this.addContent(this._oVBox);
		this._oMainLayout = new VBox(this.getId() + "-mainLayout", {
			fitContainer: true,
			items: [
				this._oFilterBar
			],
			layoutData: new FlexItemData({
				growFactor: 1,
				shrinkFactor: 0
			})
		});
		this._oVBox.addItem(this._oMainLayout);
		this._oSelectedRanges = {};
	};

	/**
	 * Initializes the control after adding dependency.
	 * @public
	 */
	AHDialog.prototype.initialize = function () {
		this._oResourceBundle = this.getModel("i18n").getResourceBundle();
		this._updateView();
	};

	/**
	 * Update the visible view of the dialog. 
	 * @private
	 */
	AHDialog.prototype._updateView = function () {
		this._oMainLayout.removeAllItems();
		this._createAddRanges();
		this.setTitle(this._oResourceBundle.getText("AHDialogTitle"));
		this.addButton(this._createOKButton());
		this.addButton(this._createCancelButton());
		this._updatePanelsKeyFields();
	};

	/**
	 * Create a new instance of ranges grid and adds it into the main layout.
	 * @private
	 */
	AHDialog.prototype._createAddRanges = function () {
		this._oRanges = this._createRanges();
		this._oMainLayout.addItem(this._oRanges);
	};

	/**
	 * Create a new instance of ranges grid with all inner controls.
	 * @returns {sap.ui.layout.Grid} the ranges grid
	 * @private
	 */
	AHDialog.prototype._createRanges = function () {
		this._oDatesPanel = new AHPanel(this.getId() + "-datesPanel", {
			maxIncludes: this.getMaxIncludeRanges(),
			panelTitle: this._oResourceBundle.getText("AHDialogDatesPanelTitle"),
			containerQuery: true,
			enableEmptyOperations: true,
			filterItemChanged: this._onFilterItemChanged.bind(this)
		});

		this._oMasterDataPanel = new AHPanel(this.getId() + "-masterDataPanel", {
			maxIncludes: this.getMaxIncludeRanges(),
			panelTitle: this._oResourceBundle.getText("AHDialogMasterDataPanelTitle"),
			containerQuery: true,
			enableEmptyOperations: true,
			filterItemChanged: this._onFilterItemChanged.bind(this)
		});

		var oRangeFieldsGrid = new Grid(this.getId() + "-rangeFieldsGrid", {
			width: "100%",
			defaultSpan: "L12 M12 S12",
			vSpacing: 0,
			hSpacing: 0,
			content: [
				this._oMasterDataPanel,
				this._oDatesPanel
			]
		}).addStyleClass("sapUiRespGridOverflowHidden");

		return oRangeFieldsGrid;
	};

	/**
	 * Event handler for item changed event.
	 * Add/update/delete range.
	 * @param {sap.ui.base.Event} oEvent item changed event.
	 * @private
	 */
	AHDialog.prototype._onFilterItemChanged = function (oEvent) {
		var sReason = oEvent.getParameter("reason"),
			sKey = oEvent.getParameter("key"),
			oItem = oEvent.getParameter("itemData");
		if (oItem && sReason === "added") {
			this._addRange(sKey, oItem);
		}

		if (oItem && sReason === "updated") {
			this._updateRange(sKey, oItem);
		}

		if (sReason === "removed") {
			delete this._oSelectedRanges[sKey];
		}
	};

	/**
	 * Adds range.
	 * @param {string} sKey key field.
	 * @param {object} oItem filter item.
	 * @private
	 */
	AHDialog.prototype._addRange = function (sKey, oItem) {
		var oRange = {
			exclude: oItem.exclude,
			keyField: oItem.columnKey,
			operation: oItem.operation,
			value1: oItem.value1,
			value2: oItem.value2
		};
		this._oSelectedRanges[sKey] = oRange;
	};

	/**
	 * Updates range.
	 * @param {string} sKey key field.
	 * @param {object} oItem filter item.
	 * @private
	 */
	AHDialog.prototype._updateRange = function (sKey, oItem) {
		var oRange = this._oSelectedRanges[sKey];
		oRange.exclude = oItem.exclude;
		oRange.keyField = oItem.columnKey;
		oRange.operation = oItem.operation;
		oRange.value1 = oItem.value1;
		oRange.value2 = oItem.value2;
	};

	/**
	 * Creates and returns OK Button
	 * @returns {sap.m.Button} OK Button control
	 * @private
	 */
	AHDialog.prototype._createOKButton = function () {
		return new Button(this.getId() + "-ok", {
			type: ButtonType.Emphasized,
			press: this.onOKButtonPress.bind(this),
			text: this._oResourceBundle.getText("AHDialogOKButton"),
			layoutData: new OverflowToolbarLayoutData({
				priority: OverflowToolbarPriority.NeverOverflow
			})
		});
	};

	/**
	 * Creates and returns CANCEL Button
	 * @returns {sap.m.Button} CANCEL Button control
	 * @private
	 */
	AHDialog.prototype._createCancelButton = function () {
		return new Button(this.getId() + "-cancel", {
			text: this._oResourceBundle.getText("AHDialogCancelButton"),
			layoutData: new OverflowToolbarLayoutData({
				priority: OverflowToolbarPriority.NeverOverflow
			}),
			press: function () {
				this.getParent().close();
			}
		});
	};

	/**
	 * Sets saved ranges.
	 * @param {object} oSelectedRanges selected ranges
	 * @public
	 */
	AHDialog.prototype.setSelectedRanges = function (oSelectedRanges) {
		this._oSelectedRanges = Object.assign({}, oSelectedRanges);
		this._oDatesPanel.setConditions(this._getPanelConditions("dates"));
		this._oMasterDataPanel.setConditions(this._getPanelConditions("masterData"));
	};

	/**
	 * Gets conditions of one panel.
	 * @param {string} sPanel panel name.
	 * @returns {Array} array of conditions.
	 * @private
	 */
	AHDialog.prototype._getPanelConditions = function (sPanel) {
		var aConditions = [];
		Object.keys(this._oSelectedRanges).filter(function (sKey) {
			if (sKey.indexOf(sPanel) >= 0) {
				aConditions.push(this._oSelectedRanges[sKey]);
			}
		}.bind(this));
		return aConditions;
	};

	/**
	 * Sets key fields by metadata for panels.
	 * @private
	 */
	AHDialog.prototype._updatePanelsKeyFields = function () {
		var oEntityMeta = this.getModel().getServiceMetadata().dataServices.schema[0].entityType.find(function (entityType) {
				return entityType.name === this.getEntityType();
			}.bind(this)),
			aDatesProperties = [],
			aMasterProperties = [],
			aDatesAsMaster = ["FreeDefinedDate1", "FreeDefinedDate2"];

		oEntityMeta.property.forEach(function (oProperty) {
			if (this._isFilterableProperty(oProperty.extensions)) {
				if (oProperty.type === "Edm.DateTime" && aDatesAsMaster.indexOf(oProperty.name) < 0) {
					aDatesProperties.push(oProperty);
				} else {
					aMasterProperties.push(oProperty);
				}
			}
		}.bind(this));
		this._setsKeyFieldsModels(aMasterProperties, aDatesProperties);

	};

	/**
	 * Sets models with filter list.
	 * @param {Array} aMasterProperties filter list.
	 * @param {Array} aDatesProperties filter list.
	 * @private
	 */
	AHDialog.prototype._setsKeyFieldsModels = function (aMasterProperties, aDatesProperties) {
		var aMasterDataKeyFields = this._getKeyFields(aMasterProperties),
			aDatesKeyFields = this._getKeyFields(aDatesProperties);
		this.setModel(new JSONModel({
			keyFields: aMasterDataKeyFields
		}), CONSTANTS.MODELS.MASTER_KEYS_MODEL_NAME);
		this.setModel(new JSONModel({
			keyFields: aDatesKeyFields
		}), CONSTANTS.MODELS.DATES_KEYS_MODEL_NAME);
		this._oDatesPanel.setKeyFields(aDatesKeyFields);
		this._oMasterDataPanel.setKeyFields(aMasterDataKeyFields);
	};

	/**
	 * Defines filterable property or not.
	 * @param {Array} aPropertyExtensions array of property extensions.
	 * @returns {boolean} filterable property or not.
	 * @private
	 */
	AHDialog.prototype._isFilterableProperty = function (aPropertyExtensions) {
		var bNonFilterable = aPropertyExtensions && this._findExtension(aPropertyExtensions, "filterable");
		return !bNonFilterable;
	};

	/**
	 * Gets key fields by metadata for panels.
	 * @param {Array} aProperties array of metadata properties.
	 * @returns {Array} aKeyFields array of key fields.
	 * @private
	 */
	AHDialog.prototype._getKeyFields = function (aProperties) {
		var aKeyFields = [];
		aProperties.forEach(function (oPropety) {
			aKeyFields.push({
				key: oPropety.name,
				text: this._findExtension(oPropety.extensions, "label"),
				type: this._getKeyFieldType(oPropety),
				group: this._getGroup(oPropety.name)
			});
		}.bind(this));
		return aKeyFields;
	};

	/**
	 * Gets group name.
	 * @param {string} sPropetyName filter name.
	 * @returns {string} group name.
	 * @private
	 */
	AHDialog.prototype._getGroup = function (sPropetyName) {
		var sGroup = "",
			sNamespace = this.getModel().getServiceMetadata().dataServices.schema[0].namespace,
			sEntityType = this.getEntityType(),
			sAnnotationTarget = sNamespace + "." + sEntityType,
			oEntityTypeAnnotation = this.getModel().getServiceAnnotations()[sAnnotationTarget] || {},
			aGroupesNames = Object.keys(oEntityTypeAnnotation).filter(function (sAnnotationName) {
				return sAnnotationName.indexOf("FieldGroup") >= 0;
			});

		aGroupesNames.some(function (sGroupesName) {
			var oPropertyGroup = oEntityTypeAnnotation[sGroupesName].Data.find(function (oData) {
				return sPropetyName === oData.Value.Path;
			});
			if (oPropertyGroup) {
				sGroup = oPropertyGroup.Label.String;
			}
		});
		return sGroup;
	};

	/**
	 * Gets extension value.
	 * @param {Array} aPropertyExtensions array of property extensions.
	 * @param {string} sExtensionName extension name
	 * @returns {string|boolean|object} extension value.
	 * @private
	 */
	AHDialog.prototype._findExtension = function (aPropertyExtensions, sExtensionName) {
		var oFinedExtension = aPropertyExtensions.find(function (oExtension) {
			return oExtension.name === sExtensionName;
		});
		return oFinedExtension ? oFinedExtension.value : oFinedExtension;
	};

	/**
	 * Gets key field type.
	 * @param {object} oProperty property object.
	 * @returns {string} key field type.
	 * @private
	 */
	AHDialog.prototype._getKeyFieldType = function (oProperty) {
		var bMulti = oProperty.extensions && this._findExtension(oProperty.extensions, "value-list");
		return bMulti ? "multi" : this._getStandardType(oProperty.type);
	};

	/**
	 * Gets standard type.
	 * @param {string} sType EDM Data Type.
	 * @returns {string} standard type.
	 * @private
	 */
	AHDialog.prototype._getStandardType = function (sType) {
		switch (sType) {
		case "Edm.String":
			return "string";
		case "Edm.Decimal":
			return "numeric";
		case "Edm.Int32":
			return "numeric";
		case "Edm.Boolean":
			return "boolean";
		case "Edm.DateTime":
			return "date";
		default:
			return "string";
		}
	};

	/**
	 * Event handler for OK Button press event.
	 * Gets activities depending on filters.
	 * @param {sap.ui.base.Event} oEvent OK Button press event.
	 * @public
	 */
	AHDialog.prototype.onOKButtonPress = function () {
		var that = this,
			fnCallback = function () {
				that.fireOk({
					selectedRanges: that._oSelectedRanges
				});
				that.close();
			};
		this._validateRanges(fnCallback);
	};

	/**
	 * Check if the entered/modified ranges are correct, marks invalid fields yellow (Warning state) and opens a popup message dialog to give the user
	 * the feedback that some values are wrong or missing.
	 * @param {function} fnCallback will be called when all ranges are valid or the user ignores the wrong/missing fields by pressing OK
	 * @private
	 */
	AHDialog.prototype._validateRanges = function (fnCallback) {
		if (this._oRanges) {
			var bIsDatesRangesValid = this._oDatesPanel.validateConditions();
			var bIsMasterRangesValid = this._oMasterDataPanel.validateConditions();

			if (!bIsDatesRangesValid || !bIsMasterRangesValid) {
				MessageBox.show(this._oResourceBundle.getText("AHDialogWarningMessage"), {
					icon: MessageBox.Icon.WARNING,
					title: this._oResourceBundle.getText("AHDialogWarningMessageTitle"),
					actions: [
						MessageBox.Action.OK, MessageBox.Action.CANCEL
					],
					styleClass: this.$().closest(".sapUiSizeCompact").length ? "sapUiSizeCompact" : "",
					onClose: function (sResult) {
						if (sResult === MessageBox.Action.OK && fnCallback) {
							fnCallback();
						}
					}
				});
				return;
			}
		}
		fnCallback();
	};

	return AHDialog;

});
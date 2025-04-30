sap.ui.define([
	"sap/ui/core/IconPool",
	"sap/ui/core/Item",
	"sap/ui/core/ListItem",
	"sap/ui/model/odata/type/Boolean",
	"sap/ui/model/type/String",
	"sap/ui/model/odata/type/String",
	"sap/ui/model/type/Date",
	"sap/ui/model/type/Time",
	"sap/ui/model/odata/type/DateTime",
	"sap/ui/model/type/Float",
	"sap/m/Button",
	"sap/m/CheckBox",
	"sap/m/ComboBox",
	"sap/m/Select",
	"sap/m/Label",
	"sap/m/Input",
	"sap/m/DatePicker",
	"sap/m/TimePicker",
	"sap/m/DateTimePicker",
	"sap/base/Log",
	"sap/m/P13nConditionPanel",
	"sap/ui/comp/smartmultiinput/SmartMultiInput",
	"sap/ui/layout/GridData",
	"sap/ui/layout/Grid",
	"sap/ui/layout/HorizontalLayout",
	"sap/m/ButtonType",
	"sap/ui/core/ValueState",
	"sap/m/P13nConditionOperation",
	"sap/m/Token",
	"sap/m/MultiComboBox",
	"i2d/ps/networkgraph/util/Constants",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/ui/core/date/UI5Date"
], function (
	IconPool, Item, ListItem, BooleanOdataType, StringType, StringOdataType, DateType, TimeType, DateTimeOdataType, FloatType, Button,
	CheckBox, ComboBox, Select, Label, Input, DatePicker, TimePicker, DateTimePicker, Log, P13nConditionPanel, SmartMultiInput, GridData,
	Grid, HorizontalLayout, ButtonType, ValueState, P13nConditionOperation, Token, MultiComboBox, CONSTANTS, Filter, FilterOperator, Sorter, UI5Date
) {
	"use strict";

	// lazy dependency to sap.ui.comp.odata.type.StringDate
	var StringDateType;

	/**
	 * Constructor for a new AHConditionPanel.
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @constructor
	 * @public
	 */
	var AHConditionPanel = P13nConditionPanel.extend("i2d.ps.networkgraph.AHConditionPanel", {
		renderer: {
			apiVersion: 2,
			render: function (oRm, oControl) {
				oRm.openStart("section", oControl);
				oRm.class("sapMConditionPanel");
				oRm.openEnd();
				oRm.openStart("div");
				oRm.class("sapMConditionPanelContent");
				oRm.class("sapMConditionPanelBG");
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
	 * This method allows you to specify the KeyFields for the conditions. 
	 * You can set an array of object with Key and Text properties to define the keyfields.
	 * @public
	 * @param {array} aKeyFields array of KeyFields <code>[{key: "CompanyCode", text: "ID"}, {key:"CompanyName", text : "Name"}]</code>
	 */
	AHConditionPanel.prototype.setKeyFields = function (aKeyFields) {
		this._aKeyFields = aKeyFields;
		this._aKeyFields.forEach(function (oKeyField) {
			this._createKeyFieldTypeInstance(oKeyField);
		}, this);

		this._updateKeyFieldItems(this._oConditionsGrid, true);
		this._updateAllConditionsEnableStates();
		this._createAndUpdateAllKeyFields();
		this._updateAllOperations();
	};

	/**
	 * Add a single KeyField
	 * @public
	 * @param {object} oKeyField {key: "CompanyCode", text: "ID"}
	 */
	AHConditionPanel.prototype.addKeyField = function (oKeyField) {
		this._aKeyFields.push(oKeyField);
		this._createKeyFieldTypeInstance(oKeyField);
		this._updateKeyFieldItems(this._oConditionsGrid, true, true);
		this._updateAllConditionsEnableStates();
		this._createAndUpdateAllKeyFields();
		this._updateAllOperations();
	};

	/**
	 * Checks if typeInstance exists, if not creates the type instance
	 * @private
	 * @param {object} oKeyField {key: "CompanyCode", text: "ID"}
	 */
	AHConditionPanel.prototype._createKeyFieldTypeInstance = function (oKeyField) {
		if (!oKeyField.typeInstance) {
			switch (oKeyField.type) {
			case "boolean":
				oKeyField.typeInstance = new BooleanOdataType();
				break;
			case "numc":
				this._createKeyFieldNumcInstance(oKeyField);
				break;
			case "date":
				oKeyField.typeInstance = new DateType(Object.assign({}, oKeyField.formatSettings, {
					strictParsing: true
				}), {});
				break;
			case "time":
				oKeyField.typeInstance = new TimeType(Object.assign({}, oKeyField.formatSettings, {
					strictParsing: true
				}), {});
				break;
			case "datetime":
				this._createKeyFieldDatetimeInstance(oKeyField);
				break;
			case "stringdate":
				this._createKeyFieldStringdateInstance(oKeyField);
				break;
			case "numeric":
				this._createKeyFieldNumericInstance(oKeyField);
				break;
			default:
				this._createKeyFieldStringInstance(oKeyField);
				break;
			}
		}
	};

	/**
	 * Creates the string type instance
	 * @private
	 * @param {object} oKeyField {key: "CompanyCode", text: "ID"}
	 */
	AHConditionPanel.prototype._createKeyFieldStringInstance = function (oKeyField) {
		var oFormatOptions = oKeyField.formatSettings;
		if (oKeyField.maxLength) {
			oFormatOptions = Object.assign({}, oFormatOptions, {
				maxLength: oKeyField.maxLength
			});
		}
		oKeyField.typeInstance = new StringType({}, oFormatOptions);
	};

	/**
	 * Creates the stringdate type instance
	 * @private
	 * @param {object} oKeyField {key: "CompanyCode", text: "ID"}
	 */
	AHConditionPanel.prototype._createKeyFieldStringdateInstance = function (oKeyField) {
		sap.ui.getCore().loadLibrary("sap.ui.comp");
		StringDateType = StringDateType || sap.ui.requireSync("sap/ui/comp/odata/type/StringDate");
		oKeyField.typeInstance = new StringDateType(Object.assign({}, oKeyField.formatSettings, {
			strictParsing: true
		}));
	};

	/**
	 * Creates the datetime type instance
	 * @private
	 * @param {object} oKeyField {key: "CompanyCode", text: "ID"}
	 */
	AHConditionPanel.prototype._createKeyFieldDatetimeInstance = function (oKeyField) {
		oKeyField.typeInstance = new DateTimeOdataType(Object.assign({}, oKeyField.formatSettings, {
			strictParsing: true
		}), {
			displayFormat: "Date"
		});

		// when the type is a DateTime type and isDateOnly==true, the type internal might use UTC=true
		// result is that date values which we format via formatValue(oDate, "string") are shown as the wrong date.
		// The current Date format is yyyy-mm-ddT00:00:00 GMT+01
		// Workaround: changing the oFormat.oFormatOptions.UTC to false!
		var oType = oKeyField.typeInstance;
		if (!oType.oFormat) {
			// create a oFormat of the type by formating a dummy date
			oType.formatValue(UI5Date.getInstance(), "string");
		}
		if (oType.oFormat) {
			oType.oFormat.oFormatOptions.UTC = false;
		}
	};

	/**
	 * Creates the numeric type instance
	 * @private
	 * @param {object} oKeyField {key: "CompanyCode", text: "ID"}
	 */
	AHConditionPanel.prototype._createKeyFieldNumericInstance = function (oKeyField) {
		var oConstraints;
		if (oKeyField.precision || oKeyField.scale) {
			oConstraints = {};
			if (oKeyField.precision) {
				oConstraints.maxIntegerDigits = parseInt(oKeyField.precision, 10);
			}
			if (oKeyField.scale) {
				oConstraints.maxFractionDigits = parseInt(oKeyField.scale, 10);
			}
		}
		oKeyField.typeInstance = new FloatType(oConstraints);
	};

	/**
	 * Creates the numc type instance
	 * @private
	 * @param {object} oKeyField {key: "CompanyCode", text: "ID"}
	 */
	AHConditionPanel.prototype._createKeyFieldNumcInstance = function (oKeyField) {
		var oConstraints;
		if (!(oKeyField.formatSettings && oKeyField.formatSettings.isDigitSequence)) {
			Log.error("i2d.ps.networkgraph.AHConditionPanel", "NUMC type support requires isDigitSequence==true!");
			oKeyField.formatSettings = Object.assign({}, oKeyField.formatSettings, {
				isDigitSequence: true
			});
		}
		oConstraints = oKeyField.formatSettings;
		if (oKeyField.maxLength) {
			oConstraints = Object.assign({}, oConstraints, {
				maxLength: oKeyField.maxLength
			});
		}
		if (!oConstraints.maxLength) {
			Log.error("i2d.ps.networkgraph.AHConditionPanel", "NUMC type suppport requires maxLength!");
		}
		oKeyField.typeInstance = new StringOdataType({}, oConstraints);
	};

	/**
	 * Appends a new condition grid with all containing controls in the main grid
	 * @private
	 * @param {grid} oTargetGrid the main grid in which the new condition grid will be added
	 * @param {object} oConditionGridData the condition data for the new added condition grid controls
	 * @param {string} sKey the key for the new added condition grid
	 * @param {int} iPosIndex the index of the new condition in the targetGrid
	 * @param {boolean} bUseRowFromAbove use the key from the row above for creating a new row
	 * @returns {sap.ui.layout.Grid} the created control condition grid
	 */
	AHConditionPanel.prototype._createConditionRow = function (oTargetGrid, oConditionGridData, sKey, iPosIndex, bUseRowFromAbove) {
		var oButtonContainer = null,
			iPos = iPosIndex ? iPosIndex : oTargetGrid.getContent().length,
			oConditionGrid = new Grid({
				width: "100%",
				defaultSpan: "L12 M12 S12",
				hSpacing: 1,
				vSpacing: 0,
				containerQuery: this.getContainerQuery()
			}).data("_key", sKey);
		oConditionGrid.addStyleClass("sapUiRespGridOverflowHidden");

		this._aConditionsFields.forEach(function (field) {
			var oControl;
			switch (field.Control) {
			case "CheckBox":
				oControl = this._createCheckBox(oConditionGrid, oConditionGridData, field);
				break;

			case "ComboBox":
				if (field.ID === "keyField") {
					oControl = this._createKeyFieldComboBox(oTargetGrid, oConditionGrid, oConditionGridData, iPos, sKey,
						bUseRowFromAbove, field);
				}
				if (field.ID === "operation") {
					oControl = this._createOperationComboBox(oTargetGrid, oConditionGrid, oConditionGridData, iPos, sKey, field);
				}
				break;

			case "TextField":
				oControl = this._createTextField(oConditionGrid, oConditionGridData, oTargetGrid, field);
				break;

			case "Label":
				oControl = this._createLabel(oTargetGrid, field);
				break;
			}

			oConditionGrid[field.ID] = oControl;
			oConditionGrid.addContent(oControl);
		}.bind(this));

		// create a hLayout container for the remove and add buttons
		oButtonContainer = new HorizontalLayout({
			layoutData: new GridData({
				span: this.getLayoutMode() === "Desktop" ? "L2 M2 S2" : this._oButtonGroupSpan["Span" + this._sConditionType]
			})
		}).addStyleClass("floatRight");
		oConditionGrid.addContent(oButtonContainer);
		oConditionGrid.ButtonContainer = oButtonContainer;

		// create "Remove button"
		var oRemoveControl = new Button({
			type: ButtonType.Transparent,
			icon: IconPool.getIconURI("sys-cancel"),
			tooltip: this._oRb.getText("CONDITIONPANEL_REMOVE" + (this._sAddRemoveIconTooltipKey ? "_" + this._sAddRemoveIconTooltipKey : "") +
				"_TOOLTIP"),
			press: function () {
				this._handleRemoveCondition(oTargetGrid, oConditionGrid);
			}.bind(this),
			layoutData: new GridData({
				span: this.getLayoutMode() === "Desktop" ? "L1 M1 S1" : "L1 M2 S2"
			})
		});

		oRemoveControl.oTargetGrid = oTargetGrid;

		oButtonContainer.addContent(oRemoveControl);
		oConditionGrid.remove = oRemoveControl;

		// create "Add button"
		var oAddControl = new Button({
			type: ButtonType.Transparent,
			icon: IconPool.getIconURI("add"),
			tooltip: this._oRb.getText("CONDITIONPANEL_ADD" + (this._sAddRemoveIconTooltipKey ? "_" + this._sAddRemoveIconTooltipKey : "") +
				"_TOOLTIP"),
			press: function () {
				this._handleAddCondition(oTargetGrid, oConditionGrid, true);
			}.bind(this),
			layoutData: new GridData({
				span: this.getLayoutMode() === "Desktop" ? "L1 M1 S1" : "L1 M10 S10"
			})
		});

		oAddControl.oTargetGrid = oTargetGrid;
		oAddControl.addStyleClass("conditionAddBtnFloatRight");

		oButtonContainer.addContent(oAddControl);
		oConditionGrid.add = oAddControl;

		// Add the new create condition
		oTargetGrid.insertContent(oConditionGrid, iPos);

		// update Operations for all conditions
		this._updateOperationItems(oTargetGrid, oConditionGrid);
		this._changeOperationValueFields(oTargetGrid, oConditionGrid);

		// disable fields if the selectedKeyField value is none
		this._updateAllConditionsEnableStates();

		// update the add/remove buttons visibility
		this._updateConditionButtons(oTargetGrid);

		if (this.getAutoReduceKeyFieldItems()) {
			this._updateKeyFieldItems(oTargetGrid, false);
		}

		if (this._sLayoutMode) {
			this._updateLayout({
				name: this._sLayoutMode
			});
		}

		var sOperation = oConditionGrid.operation.getSelectedKey();
		// in case of a BT and a Date type try to set the minDate/maxDate for the From/To value datepicker
		if (sOperation === "BT" && oConditionGrid.value1.setMinDate && oConditionGrid.value2.setMaxDate) {
			var oValue1 = oConditionGrid.value1.getDateValue(),
				oValue2 = oConditionGrid.value2.getDateValue();
			this._updateMinMaxDate(oConditionGrid, oValue1, oValue2);
		} else {
			this._updateMinMaxDate(oConditionGrid, null, null);
		}

		return oConditionGrid;
	};

	/**
	 * Creates combo box for key fields in the main grid.
	 * @private
	 * @param {grid} oTargetGrid the main grid in which the new condition grid will be added
	 * @param {Grid} oConditionGrid which contains the fields of a single condition
	 * @param {object} oConditionGridData the condition data for the new added condition grid controls
	 * @param {int} iPos the index of the new condition in the targetGrid
	 * @param {string} sKey the key for the new added condition grid
	 * @param {boolean} bUseRowFromAbove use the key from the row above for creating a new row
	 * @param {object} field condition field info
	 * @returns {sap.m.ComboBox} the created control
	 */
	AHConditionPanel.prototype._createKeyFieldComboBox = function (oTargetGrid, oConditionGrid, oConditionGridData, iPos, sKey,
		bUseRowFromAbove, field) {
		var sModelName = this.getId() === "dates" ? CONSTANTS.MODELS.DATES_KEYS_MODEL_NAME : CONSTANTS.MODELS.MASTER_KEYS_MODEL_NAME,
			bGroup = this.getId() !== "dates",
			oControl = new ComboBox({
				width: "100%",
				ariaLabelledBy: this._oInvisibleTextField,
				items: {
					path: sModelName + ">/keyFields",
					sorter: new Sorter("group", false, bGroup),
					template: new Item({
						key: "{" + sModelName + ">key}",
						text: "{" + sModelName + ">text}"
					}),
					templateShareable: true
				}
			}),
			fOriginalKey = oControl.setSelectedKey.bind(oControl);

		oControl.setSelectedKey = function (sOriginalKey) {
			fOriginalKey(sOriginalKey);
			var fValidate = this.getValidationExecutor();
			if (fValidate) {
				fValidate();
			}
		}.bind(this);

		var fOriginalItem = oControl.setSelectedItem.bind(oControl);
		oControl.setSelectedItem = function (oItem) {
			fOriginalItem(oItem);
			var fValidate = this.getValidationExecutor();
			if (fValidate) {
				fValidate();
			}
		}.bind(this);

		oControl.setLayoutData(new GridData({
			span: field["Span" + this._sConditionType]
		}));

		this._fillKeyFieldListItems(oControl, this._aKeyFields);

		if (oControl.attachSelectionChange) {
			oControl.attachSelectionChange(function (oEvent) {
				var fValidate = this.getValidationExecutor();
				if (fValidate) {
					fValidate();
				}

				this._handleSelectionChangeOnKeyField(oTargetGrid, oConditionGrid);
			}.bind(this));
		}

		if (oControl.attachChange) {
			oControl.attachChange(function (oEvent) {
				oConditionGrid.keyField.close();
				this._handleChangeOnKeyField(oTargetGrid, oConditionGrid);
			}.bind(this));
		}

		if (oControl.setSelectedItem) {
			if (oConditionGridData) {
				oControl.setSelectedKey(oConditionGridData.keyField);
				this._aKeyFields.forEach(function (oKeyField, index) {
					var key = oKeyField.key;
					if (key === undefined) {
						key = oKeyField;
					}
					if (oConditionGridData.keyField === key) {
						oControl.setSelectedItem(oControl.getItems()[index]);
					}
				}, this);
			} else {
				if (this.getUsePrevConditionSetting() && !this.getAutoReduceKeyFieldItems()) {
					// select the key from the condition above
					if (iPos > 0 && !sKey && bUseRowFromAbove) { //bUseRowFromAbove determines, if the default needs to be used
						var oGrid = oTargetGrid.getContent()[iPos - 1];
						if (oGrid.keyField.getSelectedKey()) {
							oControl.setSelectedKey(oGrid.keyField.getSelectedKey());
						} else {
							// if no item is selected, we have to select at least the first keyFieldItem
							if (!oControl.getSelectedItem() && oControl.getItems().length > 0) {
								oControl.setSelectedItem(oControl.getItems()[0]);
							}
						}
					} else {
						this._aKeyFields.some(function (oKeyField, index) {
							if (oKeyField.isDefault) {
								oControl.setSelectedItem(oControl.getItems()[index]);
								return true;
							}
							if (!oControl.getSelectedItem() && oKeyField.type !== "boolean") {
								oControl.setSelectedItem(oControl.getItems()[index]);
							}
							return false;
						}, this);

						// if no item is selected, we have to select at least the first keyFieldItem
						if (!oControl.getSelectedItem() && oControl.getItems().length > 0) {
							oControl.setSelectedItem(oControl.getItems()[0]);
						}
					}
				} else {
					this._aKeyFields.forEach(function (oKeyField, index) {
						if (oKeyField.isDefault) {
							oControl.setSelectedItem(oControl.getItems()[index]);
						}
					}, this);
				}
			}
		}

		// init tooltip of select control
		if (oControl.getSelectedItem && oControl.getSelectedItem()) {
			oControl.setTooltip(oControl.getSelectedItem().getTooltip() || oControl.getSelectedItem().getText());
		}
		return oControl;
	};

	/**
	 * Creates combo box for operations in the main grid.
	 * @private
	 * @param {grid} oTargetGrid the main grid in which the new condition grid will be added
	 * @param {Grid} oConditionGrid which contains the fields of a single condition
	 * @param {object} oConditionGridData the condition data for the new added condition grid controls
	 * @param {int} iPos the index of the new condition in the targetGrid
	 * @param {string} sKey the key for the new added condition grid
	 * @param {object} field condition field info
	 * @returns {sap.m.ComboBox} the created control
	 */
	AHConditionPanel.prototype._createOperationComboBox = function (oTargetGrid, oConditionGrid, oConditionGridData, iPos, sKey, field) {
		var oControl = new Select({
			width: "100%",
			ariaLabelledBy: this._oInvisibleTextOperator,
			layoutData: new GridData({
				span: field["Span" + this._sConditionType]
			})
		});

		oControl.attachChange(function () {
			this._handleChangeOnOperationField(oTargetGrid, oConditionGrid);
		}.bind(this));

		// fill some operations to the control to be able to set the selected items
		oConditionGrid[field.ID] = oControl;
		this._updateOperationItems(oTargetGrid, oConditionGrid);

		if (oConditionGridData) {
			var oKeyField = this._getCurrentKeyFieldItem(oConditionGrid.keyField),
				aOperations = this._oTypeOperations.default;
			if (oKeyField) {
				if (oKeyField.type && this._oTypeOperations[oKeyField.type]) {
					aOperations = this._oTypeOperations[oKeyField.type];
				}
				if (oKeyField.operations) {
					aOperations = oKeyField.operations;
				}
			}

			aOperations.some(function (oOperation, index) {
				if (oConditionGridData.operation === oOperation) {
					oControl.setSelectedKey(oOperation);
					return true;
				}
				return false;
			}, this);
		} else {
			if (this.getUsePrevConditionSetting()) {
				// select the key from the condition above
				if (iPos > 0 && sKey === null) {
					var oGrid = oTargetGrid.getContent()[iPos - 1];
					oControl.setSelectedKey(oGrid.operation.getSelectedKey());
				}
			}
		}

		// init tooltip of select control
		if (oControl.getSelectedItem && oControl.getSelectedItem()) {
			oControl.setTooltip(oControl.getSelectedItem().getTooltip() || oControl.getSelectedItem().getText());
		}
		return oControl;
	};

	/**
	 * Creates label control in the main grid.
	 * @private
	 * @param {grid} oTargetGrid the main grid in which the new condition grid will be added
	 * @param {object} field condition field info
	 * @returns {sap.m.Label} the created control
	 */
	AHConditionPanel.prototype._createLabel = function (oTargetGrid, field) {
		var oControl = new Label({
			text: field.Text + ":",
			visible: this.getShowLabel(),
			layoutData: new GridData({
				span: field["Span" + this._sConditionType]
			})
		}).addStyleClass("conditionLabel");

		oControl.oTargetGrid = oTargetGrid;
		return oControl;
	};

	/**
	 * Creates field for value in the main grid.
	 * @private
	 * @param {Grid} oConditionGrid which contains the fields of a single condition
	 * @param {object} oConditionGridData the condition data for the new added condition grid controls
	 * @param {grid} oTargetGrid the main grid in which the new condition grid will be added
	 * @param {object} field condition field info
	 * @returns {sap.ui.core.Control} the created control
	 */
	AHConditionPanel.prototype._createTextField = function (oConditionGrid, oConditionGridData, oTargetGrid, field) {
		var oCurrentKeyField = this._getCurrentKeyFieldItem(oConditionGrid.keyField),
			oControl = this._createValueField(oCurrentKeyField, field, oConditionGrid);
		oControl.oTargetGrid = oTargetGrid;

		if (oConditionGridData && oConditionGridData[field.ID] !== undefined) {
			var vValue = oConditionGridData[field.ID];
			if (oControl instanceof Select) {
				if (typeof vValue === "boolean") {
					oControl.setSelectedIndex(vValue ? 2 : 1);
				}
			} else if (oControl instanceof MultiComboBox) {
				this._setUserStatuses(vValue, oControl);
			} else if (oControl instanceof SmartMultiInput) {
				oControl.attachInitialise(this._setMultiData.bind(this, vValue));
			} else if (vValue !== null && oConditionGrid.oType) {

				// In case vValue is of type string, and type is StringDate we can set the value without formatting.
				if (typeof vValue === "string" && oConditionGrid.oType.getName() === "sap.ui.comp.odata.type.StringDate") {
					oControl.setValue(vValue);
				} else if (typeof vValue === "string" && oConditionGrid.oType.getName() === "Date") {
					var oDate = UI5Date.getInstance(vValue);
					oControl.setDateValue(oDate);
				} else {
					// In case vValue is of type string, we try to convert it into the type based format.
					if (typeof vValue === "string" && ["String", "sap.ui.model.odata.type.String", "Float", "sap.ui.model.odata.type.Decimal"].indexOf(
							oConditionGrid.oType.getName()) === -1) {
						try {
							vValue = oConditionGrid.oType.parseValue(vValue, "string");
							oControl.setValue(oConditionGrid.oType.formatValue(vValue, "string"));
						} catch (err) {
							Log.error("i2d.ps.networkgraph.AHConditionPanel", "Value '" + vValue + "' does not have the expected type format for " +
								oConditionGrid.oType
								.getName() + ".parseValue()");
						}
					} else {
						oControl.setValue(oConditionGrid.oType.formatValue(vValue, "string"));
					}
				}

			} else {
				oControl.setValue(vValue);
			}
		}

		return oControl;

	};

	/**
	 * Creates checkbox in the main grid. 
	 * The CheckBox is not visible and only used internal to validate if a condition is filled correct.
	 * @private
	 * @param {Grid} oConditionGrid which contains the fields of a single condition
	 * @param {object} oConditionGridData the condition data for the new added condition grid controls
	 * @param {object} field condition field info
	 * @returns {sap.ui.core.Control} the created control
	 */
	AHConditionPanel.prototype._createCheckBox = function (oConditionGrid, oConditionGridData, field) {
		var oControl = new CheckBox({
			enabled: false,
			visible: false,
			layoutData: new GridData({
				span: field["Span" + this._sConditionType]
			})
		});

		if (field.ID === "showIfGrouped") {
			oControl.setEnabled(true);
			oControl.setText(field.Label);
			oControl.attachSelect(function () {
				this._changeField(oConditionGrid);
			}.bind(this));

			oControl.setSelected(oConditionGridData ? oConditionGridData.showIfGrouped : true);
		} else {
			if (oConditionGridData) {
				oControl.setSelected(true);
				oControl.setEnabled(true);
			}
		}

		return oControl;
	};

	/**
	 * Gets filters for status profile.
	 * @private
	 * @returns {Array} filters array.
	 */
	AHConditionPanel.prototype._getStatusProfileFilters = function () {
		var aFilters = [],
			aUniqueNodes = this._getUniqueNodesByStausProfile();

		aUniqueNodes.forEach(function (oNode) {
			aFilters.push(new Filter("StatusProfile", FilterOperator.EQ, oNode.MaintUserStatusProfileCode));
		});

		return aFilters;
	};

	/**
	 * Gets nodes with unique status profile.
	 * @private
	 * @returns {Array} array with unique nodes.
	 */
	AHConditionPanel.prototype._getUniqueNodesByStausProfile = function () {
		var aNodes = this.getModel(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getProperty("/nodes");
		return aNodes.reduce(function (aUniqueNodes, oNode) {
			var bDublicate = aUniqueNodes.some(function (el) {
				return el.MaintUserStatusProfileCode === oNode.MaintUserStatusProfileCode;
			});
			if (!bDublicate) {
				aUniqueNodes.push(oNode);
			}
			return aUniqueNodes;
		}, []);
	};

	/**
	 * Sets data to multi comboboxes and multi inputs.
	 * @param {Array} aTokensData array of key values objects
	 * @param {sap.ui.base.Event} oEvent initialise control event.
	 * @private
	 */
	AHConditionPanel.prototype._setMultiData = function (aTokensData, oEvent) {
		if (aTokensData) {
			var oControl = oEvent.getSource().getContent();
			if (oControl.isA("sap.m.MultiComboBox")) {
				var aKeys = aTokensData.map(function (oToken) {
					return oToken.key;
				});
				oControl.setSelectedKeys(aKeys);
			} else {
				var aTokens = aTokensData.map(function (oToken) {
					return new Token({
						key: oToken.key,
						text: oToken.text
					});
				});
				oControl.setTokens(aTokens);
			}
		}
	};

	/**
	 * Sets data to multi comboboxes and multi inputs.
	 * @param {Array} aData array of key values objects
	 * @param {sap.m.MultiComboBox} oControl multi combo box for user statuses.
	 * @private
	 */
	AHConditionPanel.prototype._setUserStatuses = function (aData, oControl) {
		if (aData) {
			var aKeys = aData.map(function (oItem) {
				return oItem.key;
			});
			oControl.setSelectedKeys(aKeys);
		}
	};

	/**
	 * Creates a new control for the condition value1 and value2 field. 
	 * @private
	 * @param {object} oCurrentKeyField object of the current selected KeyField which contains 
	 * type of the column ("string", "date", "time", "numeric" or "boolean") and a maxLength information
	 * @param {object} oFieldInfo field information
	 * @param {grid} oConditionGrid which should contain the new created field
	 * @returns {sap.ui.core.Control} the created control instance 
	 */
	AHConditionPanel.prototype._createValueField = function (oCurrentKeyField, oFieldInfo, oConditionGrid) {
		var oControl,
			sCtrlType,
			params = {
				value: oFieldInfo.value,
				width: "100%",
				placeholder: oFieldInfo.Label,
				change: function (oEvent) {
					this._validateAndFormatFieldValue(oEvent);
					this._changeField(oConditionGrid, oEvent);
				}.bind(this),
				layoutData: new GridData({
					span: oFieldInfo["Span" + this._sConditionType]
				})
			};

		if (oCurrentKeyField && oCurrentKeyField.typeInstance) {
			var oType = oCurrentKeyField.typeInstance;
			sCtrlType = this._findConfig(oType, oCurrentKeyField.type, "ctrl");

			// use the DatePicker when type is sap.ui.model.odata.type.DateTime and displayFormat = Date
			if (sCtrlType === "DateTimePicker" && oType.getMetadata().getName() === "sap.ui.model.odata.type.DateTime") {
				if (!(oType.oConstraints && oType.oConstraints.isDateOnly)) {
					Log.error("i2d.ps.networkgraph.AHConditionPanel", "sap.ui.model.odata.type.DateTime without displayFormat = Date is not supported!");
					oType.oConstraints = Object.assign({}, oType.oConstraints, {
						isDateOnly: true
					});
				}
				sCtrlType = "DatePicker";
			}

			oConditionGrid.oType = oType;
			oControl = this._createValueFieldByCtrlType(oConditionGrid, oCurrentKeyField, oFieldInfo, sCtrlType, oType, params);
		} else {
			// for a new added dummy row, which does not have a oCurrentKeyField, we have to create a dummy input field.
			oConditionGrid.oType = null;
			oControl = new Input(params);
		}

		if (sCtrlType !== "boolean" && sCtrlType !== "enum" && oControl) {
			oControl.onpaste = this._onPasteHandler.bind(this);
		}

		if (oCurrentKeyField && oCurrentKeyField.maxLength && oControl.setMaxLength) {
			this._setKeyFieldMaxLength(oCurrentKeyField, oControl);
		}

		return oControl;
	};

	/**
	 * Creates a new control for the condition value1 and value2 field depending on control type. 
	 * @private
	 * @param {grid} oConditionGrid which should contain the new created field
	 * @param {object} oCurrentKeyField object of the current selected KeyField which contains 
	 * type of the column ("string", "date", "time", "numeric" or "boolean") and a maxLength information
	 * @param {object} oFieldInfo field information
	 * @param {string} sCtrlType control type
	 * @param {object} oType instance type
	 * @param {object} params object of params for control
	 * @returns {sap.ui.core.Control} the created control instance 
	 */
	AHConditionPanel.prototype._createValueFieldByCtrlType = function (oConditionGrid, oCurrentKeyField, oFieldInfo, sCtrlType, oType,
		params) {
		var oControl;
		if (sCtrlType === "select") {
			oControl = this._createSelectValueField(oConditionGrid, oCurrentKeyField, oType, params);
		} else if (sCtrlType === "TimePicker") {
			oControl = this._createTimePickerValueField(oType, params);
		} else if (sCtrlType === "DateTimePicker") {
			oControl = this._createTimePickerValueField(oType, params);
		} else if (sCtrlType === "DatePicker") {
			oControl = this._createDatePickerValueField(oType, params);
		} else if (sCtrlType === "SmartMultiInput" && oCurrentKeyField.key === "UserStatusShortName") {
			oControl = this._createUserStatusValueField(oConditionGrid, params);
		} else if (sCtrlType === "SmartMultiInput") {
			oControl = this._createSmartMultiInputValueField(oConditionGrid, oCurrentKeyField, params);
		} else {
			oControl = this._createInputValueField(oConditionGrid, params);
		}
		return oControl;
	};

	/**
	 * Creates a select for the condition value1 and value2 field. 
	 * @private
	 * @param {grid} oConditionGrid which should contain the new created field
	 * @param {object} oCurrentKeyField object of the current selected KeyField which contains 
	 * type of the column ("string", "date", "time", "numeric" or "boolean") and a maxLength information
	 * @param {object} oType instance type
	 * @param {object} params object of params for control
	 * @returns {sap.m.Select} the created control instance 
	 */
	AHConditionPanel.prototype._createSelectValueField = function (oConditionGrid, oCurrentKeyField, oType, params) {
		var aItems = [],
			oControl,
			aValues = oCurrentKeyField.values || this._oTypeValues.select || [
				"", oType.formatValue(false, "string"), oType.formatValue(true, "string")
			];
		aValues.forEach(function (oValue, index) {
			aItems.push(new Item({
				key: index.toString(),
				text: oValue.toString()
			}));
		});

		params.items = aItems;
		params.change = function () {
			this._changeField(oConditionGrid);
			this._makeFieldValid(oControl, true);
		}.bind(this);
		delete params.value;
		delete params.placeholder;

		oControl = new Select(params);

		return oControl;
	};

	/**
	 * Creates a time picker for the condition value1 and value2 field. 
	 * @private
	 * @param {object} oType instance type
	 * @param {object} params object of params for control
	 * @returns {sap.m.TimePicker} the created control instance 
	 */
	AHConditionPanel.prototype._createTimePickerValueField = function (oType, params) {
		if (oType.oFormatOptions && oType.oFormatOptions.style) {
			params.displayFormat = oType.oFormatOptions.style;
		}
		return new TimePicker(params);
	};

	/**
	 * Creates a datetime picker for the condition value1 and value2 field. 
	 * @private
	 * @param {object} oType instance type
	 * @param {object} params object of params for control
	 * @returns {sap.m.DateTimePicker} the created control instance 
	 */
	AHConditionPanel.prototype._createDateTimePickerValueField = function (oType, params) {
		if (oType.oFormatOptions && oType.oFormatOptions.style) {
			params.displayFormat = oType.oFormatOptions.style;
		}
		return new DateTimePicker(params);
	};

	/**
	 * Creates a date picker for the condition value1 and value2 field. 
	 * @private
	 * @param {object} oType instance type
	 * @param {object} params object of params for control
	 * @returns {sap.m.DateTimePicker} the created control instance 
	 */
	AHConditionPanel.prototype._createDatePickerValueField = function (oType, params) {
		if (oType.oFormatOptions) {
			params.displayFormat = oType.oFormatOptions.style || oType.oFormatOptions.pattern;

			if (oType.isA("sap.ui.comp.odata.type.StringDate")) {
				params.valueFormat = "yyyyMMdd";
			}
		}
		return new DatePicker(params);
	};

	/**
	 * Creates a multi combobox for the condition value1 and value2 of user status field. 
	 * @private
	 * @param {grid} oConditionGrid which should contain the new created field
	 * @param {object} params object of params for control
	 * @returns {sap.m.MultiComboBox} the created control instance 
	 */
	AHConditionPanel.prototype._createUserStatusValueField = function (oConditionGrid, params) {
		var oControl;
		params.selectionChange = function () {
			this._changeField(oConditionGrid);
			this._makeFieldValid(oControl, true);
		}.bind(this);
		params.items = {
			path: "/C_NetworkActivityUserStatusVH",
			filters: this._getStatusProfileFilters(),
			templateShareable: true,
			template: new Item({
				key: "{parts: ['StatusProfile', 'UserStatusShortName']}",
				text: "{UserStatusShortName}"
			})
		};
		oControl = new MultiComboBox(params);

		return oControl;
	};

	/**
	 * Creates a smart multi input for the condition value1 and value2 field. 
	 * @private
	 * @param {grid} oConditionGrid which should contain the new created field
	 * @param {object} oCurrentKeyField object of the current selected KeyField which contains 
	 * type of the column ("string", "date", "time", "numeric" or "boolean") and a maxLength information
	 * @param {object} params object of params for control
	 * @returns {sap.m.Select} the created control instance 
	 */
	AHConditionPanel.prototype._createSmartMultiInputValueField = function (oConditionGrid, oCurrentKeyField, params) {
		var oSuggestProvider,
			oControl;
		params.value = "{" + oCurrentKeyField.key + "}";
		params.entitySet = "C_NtwkActivityGraphOverview";
		params.selectionChange = function () {
			this._changeField(oConditionGrid);
			this._makeFieldValid(oControl, true);
		}.bind(this);
		params.tokenUpdate = function (oEvent) {
			this._changeField(oConditionGrid, oEvent);
			this._makeFieldValid(oControl, true);
		}.bind(this);
		oControl = new SmartMultiInput(params);

		if (this._fSuggestCallback) {
			var oMultiInputKeyField = this._getCurrentKeyFieldItem(oConditionGrid.keyField);
			if (oMultiInputKeyField && oMultiInputKeyField.key) {
				oSuggestProvider = this._fSuggestCallback(oControl, oMultiInputKeyField.key);
				oControl._oSuggestProvider = oSuggestProvider ? oSuggestProvider : oControl._oSuggestProvider;
			}
		}
		return oControl;
	};

	/**
	 * Creates a input for the condition value1 and value2 field. 
	 * @private
	 * @param {grid} oConditionGrid which should contain the new created field
	 * @param {object} params object of params for control
	 * @returns {sap.m.Select} the created control instance 
	 */
	AHConditionPanel.prototype._createInputValueField = function (oConditionGrid, params) {
		var oSuggestProvider,
			oControl = new Input(params);

		if (this._fSuggestCallback) {
			var oInputKeyField = this._getCurrentKeyFieldItem(oConditionGrid.keyField);
			if (oInputKeyField && oInputKeyField.key) {
				oSuggestProvider = this._fSuggestCallback(oControl, oInputKeyField.key);
				oControl._oSuggestProvider = oSuggestProvider ? oSuggestProvider : oControl._oSuggestProvider;
			}
		}

		return oControl;
	};

	/**
	 * Set max length for field control. 
	 * @private
	 * @param {object} oCurrentKeyField object of the current selected KeyField which contains 
	 * type of the column ("string", "date", "time", "numeric" or "boolean") and a maxLength information
	 * @param {sap.m.Control} oControl field control
	 */
	AHConditionPanel.prototype._setKeyFieldMaxLength = function (oCurrentKeyField, oControl) {
		var l = -1;
		if (typeof oCurrentKeyField.maxLength === "string") {
			l = parseInt(oCurrentKeyField.maxLength, 10);
		}
		if (typeof oCurrentKeyField.maxLength === "number") {
			l = oCurrentKeyField.maxLength;
		}
		if (l > 0 && (!oControl.getShowSuggestion || !oControl.getShowSuggestion())) {
			oControl.setMaxLength(l);
		}
	};

	/**
	 * Event handler for paste event. 
	 * @private
	 * @param {sap.ui.base.Event} oEvent event of paste.
	 */
	AHConditionPanel.prototype._onPasteHandler = function (oEvent) {
		var sOriginalText;
		// for the purpose to copy from column in excel and paste in MultiInput/MultiComboBox
		if (window.clipboardData) {
			//IE
			sOriginalText = window.clipboardData.getData("Text");
		} else {
			// Chrome, Firefox, Safari
			sOriginalText = oEvent.originalEvent.clipboardData.getData("text/plain");
		}

		var oConditionGrid = oEvent.srcControl.getParent(),
			aSeparatedText = sOriginalText.split(/\r\n|\r|\n/g);
		if (aSeparatedText && aSeparatedText[aSeparatedText.length - 1].trim() === "") {
			//ignore the last empty array item
			aSeparatedText.pop();
		}

		var oOperation = oConditionGrid.operation,
			op = oOperation.getSelectedKey();

		if (aSeparatedText && aSeparatedText.length > 1 && op !== "BT") {
			setTimeout(function () {
				var iLength = aSeparatedText ? aSeparatedText.length : 0,
					oKeyField = this._getCurrentKeyFieldItem(oConditionGrid.keyField);
				oOperation = oConditionGrid.operation;

				for (var i = 0; i < iLength; i++) {
					if (this._aConditionKeys.length >= this._getMaxConditionsAsNumber()) {
						break;
					}

					var sPastedValue = aSeparatedText[i].trim();

					if (sPastedValue) {
						var oPastedValue;

						if (oKeyField.typeInstance) {
							// If a typeInstance exist, we have to parse and validate the pastedValue before we can add it a value into the condition.
							// or we do not handle the paste for all types except String!
							try {
								oPastedValue = oKeyField.typeInstance.parseValue(sPastedValue, "string");
								oKeyField.typeInstance.validateValue(oPastedValue);
							} catch (err) {
								Log.error("i2d.ps.networkgraph.AHConditionPanel.onPaste", "not able to parse value " + sPastedValue + " with type " +
									oKeyField.typeInstance
									.getName());
								sPastedValue = "";
								oPastedValue = null;
							}

							if (!oPastedValue) {
								continue;
							}
						}

						var oCondition = {
							"index": this._iConditions,
							"key": this._createConditionKey(),
							"exclude": this.getExclude(),
							"operation": oOperation.getSelectedKey(),
							"keyField": oKeyField.key,
							"value1": oPastedValue,
							"value2": null
						};
						this._addCondition2Map(oCondition);

						this.fireDataChange({
							key: oCondition.key,
							index: oCondition.index,
							operation: "add",
							newData: oCondition
						});
					}
				}

				this._clearConditions();
				this._fillConditions();
			}.bind(this), 0);
		}
	};

	/**
	 * Fill all KeyFieldItems from the aItems array into the select control items list.
	 * @private
	 * @param {control} oCtrl the select control which should be filled
	 * @param {array} aItems array of keyfields
	 */
	AHConditionPanel.prototype._fillKeyFieldListItems = function (oCtrl, aItems) {
		oCtrl.destroyItems();
		aItems.forEach(function (oItem) {
			oCtrl.addItem(new ListItem({
				key: oItem.key,
				text: oItem.text,
				tooltip: oItem.tooltip ? oItem.tooltip : oItem.text
			}));
		});
		oCtrl.setEditable(oCtrl.getItems().length > 1);
	};

	/**
	 * Creates the Value1/2 fields based on the KeyField Type
	 * @private
	 * @param {grid} oTargetGrid the main grid
	 * @param {grid} oConditionGrid Grid which contains the KeyField control which has been changed
	 */
	AHConditionPanel.prototype._createAndUpdateValueFields = function (oTargetGrid, oConditionGrid) {

		// update the value fields for the KeyField
		var oCurrentKeyField = this._getCurrentKeyFieldItem(oConditionGrid.keyField),

			fnCreateAndUpdateField = function (oCondGrid, oCtrl, index) {
				var ctrlIndex = oCondGrid.indexOfContent(oCtrl);

				// we have to remove the control into the content with rerendering (bSuppressInvalidate=false) the UI,
				// otherwise in some use cases the "between" value fields will not be rendered.
				// This additional rerender might trigger some problems for screenreader.
				oCondGrid.removeContent(oCtrl);

				if (oCtrl._oSuggestProvider) {
					oCtrl._oSuggestProvider.destroy();
					oCtrl._oSuggestProvider = null;
				}
				oCtrl.destroy();
				var fieldInfo = this._aConditionsFields[index],
					oValueField = this._createValueField(oCurrentKeyField, fieldInfo, oCondGrid);
				oCondGrid[fieldInfo.ID] = oValueField;

				oCondGrid.insertContent(oValueField, ctrlIndex === -1 ? oCondGrid.indexOfContent(oCondGrid.operation) + 1 : ctrlIndex);
			};

		// update Value1 field control
		fnCreateAndUpdateField.bind(this)(oConditionGrid, oConditionGrid.value1, 5);

		// update Value2 field control
		fnCreateAndUpdateField.bind(this)(oConditionGrid, oConditionGrid.value2, 6);
	};

	/*
	 * Makes a control valid or invalid, means it gets a warning state and shows a warning message attached to the field.
	 * @param {control} oCtrl field control
	 * @param {boolean} bValid validation state
	 * @param {string} sMsg message text
	 */
	AHConditionPanel.prototype._makeFieldValid = function (oCtrl, bValid, sMsg) {
		if (bValid || oCtrl.isA("sap.ui.comp.smartmultiinput.SmartMultiInput")) {
			oCtrl.setValueState(ValueState.None);
			oCtrl.setValueStateText("");
		} else {
			oCtrl.setValueState(ValueState.Error);
			oCtrl.setValueStateText(sMsg ? sMsg : this._sValidationDialogFieldMessage);
		}
	};

	/**
	 * Sets tooltipn for key field control.
	 * @private
	 * @param {grid} oConditionGrid Grid which contains the KeyField control
	 */
	AHConditionPanel.prototype._setKeyFieldTooltip = function (oConditionGrid) {
		if (oConditionGrid.keyField.getSelectedItem()) {
			oConditionGrid.keyField.setTooltip(oConditionGrid.keyField.getSelectedItem().getTooltip() || oConditionGrid.keyField.getSelectedItem()
				.getText());
		} else {
			oConditionGrid.keyField.setTooltip(null);
		}
	};

	/**
	 * Sets tooltipn for operation control.
	 * @private
	 * @param {grid} oConditionGrid Grid which contains the operation control
	 */
	AHConditionPanel.prototype._setOperationFieldTooltip = function (oConditionGrid) {
		if (oConditionGrid.operation.getSelectedItem()) {
			oConditionGrid.operation.setTooltip(oConditionGrid.operation.getSelectedItem().getTooltip() || oConditionGrid.operation.getSelectedItem()
				.getText());
		} else {
			oConditionGrid.operation.setTooltip(null);
		}
	};

	/**
	 * Gets values from field.
	 * @private
	 * @param {sap.m.Control} oControl field control
	 * @param {object} oType instance type
	 * @param {sap.ui.base.Event} oEvent change event
	  @returns {Array} array of values 
	 */
	AHConditionPanel.prototype._getValuesFromField = function (oControl, oType, oEvent) {
		var sValue,
			oValue;
		if (oControl.isA("sap.m.MultiComboBox")) {
			var aItemsData = oControl.getSelectedItems().map(function (oItem) {
				return {
					key: oItem.getKey(),
					text: oItem.getText()
				};
			});
			oValue = aItemsData.length ? aItemsData : "";
			sValue = oValue;
		} else if (oControl.isA("sap.ui.comp.smartmultiinput.SmartMultiInput")) {
			var aTokens = oControl.getTokens(),
				aRemovedTokens = oEvent ? oEvent.getParameter("removedTokens") : [];

			if (aRemovedTokens.length) {
				aTokens = aTokens.filter(function (oToken) {
					return !aRemovedTokens.some(function (oRemovedToken) {
						return oRemovedToken.getId() === oToken.getId();
					});

				});
			}

			var aTokensData = aTokens.map(function (oToken) {
				return {
					key: oToken.getKey(),
					text: oToken.getText()
				};
			});
			oValue = aTokensData.length ? aTokensData : "";
			sValue = oValue;
		} else if (oControl.getDateValue && !(oControl.isA("sap.m.TimePicker")) && oType.getName() !== "sap.ui.comp.odata.type.StringDate") {
			oValue = oControl.getDateValue();
			if (oType && oValue) {
				oValue = UI5Date.getInstance(oValue.getTime() - oValue.getTimezoneOffset() * 60000);
				if ((oEvent && oEvent.getParameter("valid")) || oControl.isValidValue()) {
					sValue = oType.formatValue(oValue, "string");
				} else {
					sValue = "";
				}
			}
		} else {
			sValue = this._getValueTextFromField(oControl);
			oValue = sValue;
			if (oType && oType.getName() === "sap.ui.comp.odata.type.StringDate") {
				sValue = oType.formatValue(oValue, "string");
			} else if (oType && sValue) {
				try {
					oValue = oType.parseValue(sValue, "string");
					oType.validateValue(oValue);
				} catch (err) {
					Log.error("i2d.ps.networkgraph.AHConditionPanel", "not able to parse value " + sValue + " with type " + oType.getName());
					sValue = "";
				}
			}
		}
		return [oValue, sValue];
	};

	/**
	 * Handle field when no key field.
	 * @private
	 * @param {sap.m.CheckBox} oSelectCheckbox check box for validation
	 * @param {grid} oConditionGrid Grid which contains the KeyField control
	 */
	AHConditionPanel.prototype._handleNoneKeyField = function (oSelectCheckbox, oConditionGrid) {
		var sKey = this._getKeyFromConditionGrid(oConditionGrid);
		this._removeConditionFromMap(sKey);

		this._enableCondition(oConditionGrid, false);

		var iIndex = this._getIndexOfCondition(oConditionGrid);

		if (oSelectCheckbox.getSelected()) {
			oSelectCheckbox.setSelected(false);
			oSelectCheckbox.setEnabled(false);

			this._bIgnoreSetConditions = true;
			this.fireDataChange({
				key: sKey,
				index: iIndex,
				operation: "remove",
				newData: null
			});
			this._bIgnoreSetConditions = false;
		}
	};

	/**
	 * Handle condition (add, update or remove).
	 * @private
	 * @param {grid} oConditionGrid Grid which contains the KeyField control
	 * @param {string} sValue1 string value from "to" field.
	 * @param {string} sValue2 string value from "from" field.
	 * @param {object} oValue1 value from "to" field.
	 * @param {object} oValue2 value from "from" field.
	 */
	AHConditionPanel.prototype._handleCondition = function (oConditionGrid, sValue1, sValue2, oValue1, oValue2) {
		var sKeyField = oConditionGrid.keyField.getSelectedKey(),
			bShowIfGrouped = oConditionGrid.showIfGrouped.getSelected(),
			bExclude = this.getExclude(),
			oSelectCheckbox = oConditionGrid.select,
			sOperation = oConditionGrid.operation.getSelectedKey(),
			sValue = "",
			sKey,
			iIndex;

		if (sKeyField === "" || !sKeyField) {
			this._handleNoneKeyField(oSelectCheckbox, oConditionGrid);
			return;
		}

		this._enableCondition(oConditionGrid, true);

		sValue = this._getFormatedConditionText(sOperation, sValue1, sValue2, bExclude, sKeyField, bShowIfGrouped);

		var oConditionData = {
			"value": sValue,
			"exclude": bExclude,
			"operation": sOperation,
			"keyField": sKeyField,
			"value1": oValue1,
			"value2": sOperation === P13nConditionOperation.BT ? oValue2 : null,
			"showIfGrouped": bShowIfGrouped
		};

		sKey = this._getKeyFromConditionGrid(oConditionGrid);

		if (sValue !== "") {
			oSelectCheckbox.setSelected(true);
			oSelectCheckbox.setEnabled(true);

			sOperation = "update";
			if (!this._oConditionsMap[sKey]) {
				sOperation = "add";
			}

			this._oConditionsMap[sKey] = oConditionData;
			if (sOperation === "add") {
				this._aConditionKeys.splice(this._getIndexOfCondition(oConditionGrid), 0, sKey);
			}
			//this._addCondition2Map(oConditionData, this._getIndexOfCondition(oConditionGrid));

			oConditionGrid.data("_key", sKey);

			this.fireDataChange({
				key: sKey,
				index: this._getIndexOfCondition(oConditionGrid),
				operation: sOperation,
				newData: oConditionData
			});
		} else if (this._oConditionsMap[sKey] !== undefined) {
			this._removeConditionFromMap(sKey);
			oConditionGrid.data("_key", null);

			iIndex = this._getIndexOfCondition(oConditionGrid);

			if (oSelectCheckbox.getSelected()) {
				oSelectCheckbox.setSelected(false);
				oSelectCheckbox.setEnabled(false);

				this._bIgnoreSetConditions = true;
				this.fireDataChange({
					key: sKey,
					index: iIndex,
					operation: "remove",
					newData: null
				});
				this._bIgnoreSetConditions = false;
			}
		}
	};

	/**
	 * Called when the user makes a change in one of the condition fields. 
	 * The function will update, remove or add the conditions for this condition.
	 * @private
	 * @param {grid} oConditionGrid Grid which contains the Operation control which has been changed
	 * @param {sap.ui.base.Event} oEvent change event.
	 */
	AHConditionPanel.prototype._changeField = function (oConditionGrid, oEvent) {
		var sOperation = oConditionGrid.operation.getSelectedKey();

		this._setKeyFieldTooltip(oConditionGrid);
		this._setOperationFieldTooltip(oConditionGrid);

		// update Value1 field control
		var aValues = this._getValuesFromField(oConditionGrid.value1, oConditionGrid.oType, oEvent),
			oValue1 = aValues[0],
			sValue1 = aValues[1];

		// update Value2 field control
		aValues = this._getValuesFromField(oConditionGrid.value2, oConditionGrid.oType, oEvent);
		var oValue2 = aValues[0],
			sValue2 = aValues[1];

		// in case of a BT and a Date type try to set the minDate/maxDate for the From/To value datepicker
		if (sOperation === "BT") {
			this._updateMinMaxDate(oConditionGrid, oValue1, oValue2);
		} else {
			this._updateMinMaxDate(oConditionGrid, null, null);
		}

		var oCurrentKeyField = this._getCurrentKeyFieldItem(oConditionGrid.keyField);
		if (oCurrentKeyField && oCurrentKeyField.type === "numc") {
			// in case of type numc and Contains or EndsWith operator the leading 0 will be removed
			if ([P13nConditionOperation.Contains, P13nConditionOperation.EndsWith].indexOf(sOperation) !== -1) {
				oValue1 = oConditionGrid.oType.formatValue(oValue1, "string");
			}
		}

		this._handleCondition(oConditionGrid, sValue1, sValue2, oValue1, oValue2);
		this._updatePaginatorToolbar();
	};

	/**
	 * Checks on a single condition if the values are filled correct and set the Status of invalid fields to Error.
	 * The condition is invalid, when e.g. in the BT condition one or both of the values is/are empty of for other condition operations the value1 field is not filled.
	 * @private
	 * @param {Grid} oConditionGrid which contains the fields of a single condition
	 * @param {boolean} isLast indicated if this is the last condition in the group
	 * @returns {boolean} true, when the condition is filled correct, else false.
	 */
	AHConditionPanel.prototype._checkCondition = function (oConditionGrid, isLast) {
		var bValid = true,
			value1 = oConditionGrid.value1,
			value2 = oConditionGrid.value2,

			bValue1Empty = value1 && (value1.getVisible() && !this._getValueTextFromField(value1)),
			bValue1State = value1 && value1.getVisible() && value1.getValueState ? value1.getValueState() : ValueState.None,
			bValue2Empty = value2 && (value2.getVisible() && !this._getValueTextFromField(value2)),
			bValue2State = value2 && value2.getVisible() && value2.getValueState ? value2.getValueState() : ValueState.None,

			sOperation = oConditionGrid.operation.getSelectedKey();

		if (sOperation === P13nConditionOperation.BT) {
			if (!bValue1Empty ? bValue2Empty : !bValue2Empty) { // XOR
				if (bValue1Empty) {
					value1.setValueState(ValueState.Error);
					value1.setValueStateText(this._sValidationDialogFieldMessage);
				}

				if (bValue2Empty) {
					value2.setValueState(ValueState.Error);
					value2.setValueStateText(this._sValidationDialogFieldMessage);
				}

				bValid = false;
			} else if (bValue1State !== ValueState.None || bValue2State !== ValueState.None) {
				bValid = false;
			} else {
				value1.setValueState(ValueState.None);
				value1.setValueStateText("");
				value2.setValueState(ValueState.None);
				value2.setValueStateText("");
			}
		}

		if ((value1.getVisible() && value1.getValueState && value1.getValueState() !== ValueState.None) || (value2.getVisible() && value2.getValueState &&
				value2.getValueState() !== ValueState.None)) {
			bValid = false;
		}

		return bValid;
	};

	/**
	 * Gets control type configuration.
	 * @private
	 * @param {object|string} vConfigType instance type
	 * @param {string} sKeyFieldType key field type
	 * @param {string} sConfigName configuration name
	 * @returns {string} control type configuration.
	 */
	AHConditionPanel.prototype._findConfig = function (vConfigType, sKeyFieldType, sConfigName) {
		var vType = vConfigType,
			sConfig;
		if (typeof vType === "object") {
			vType = vType.getMetadata().getName();
		}

		while (vType && !(sConfig = this._getConfig(vType, sKeyFieldType, sConfigName))) { // search until we have a type with known operators
			vType = this._getParentType(vType); // go to parent type
		}
		// either vType is undefined because no type in the hierarchy had the config, or sConfig does now have the desired information

		return sConfig;
	};

	/**
	 * Gets configuration.
	 * @private
	 * @param {string} sType instance type
	 * @param {string} sKeyFieldType key field type
	 * @param {string} sConfigName configuration name
	 * @returns {object} configuration.
	 */
	AHConditionPanel.prototype._getConfig = function (sType, sKeyFieldType, sConfigName) {
		var sProperty = sKeyFieldType === "multi" ? sKeyFieldType : sType,
			oConfig = this._mOpsForType[sProperty];
		if (oConfig) {
			return oConfig[sConfigName];
		}
		return undefined;
	};

	/**
	 * Defines operators for types.
	 */
	AHConditionPanel.prototype._mOpsForType = {
		"base": {
			//			operators: ["EQ", "BT", "LE", "LT", "GE", "GT", "NE"],
			//			defaultOperator: "EQ",
			ctrl: "input"
		},
		"string": {
			//			operators: ["Contains", "EQ", "BT", "StartsWith", "EndsWith", "LE", "LT", "GE", "GT", "NE"],
			//			defaultOperator: "StartsWith",
			ctrl: "input"
		},
		"date": {
			//			operators: ["EQ", "BT", "LE", "LT", "GE", "GT", "NE"],
			ctrl: "DatePicker"
		},
		"datetime": {
			//			operators: ["EQ", "BT", "LE", "LT", "GE", "GT", "NE"],
			ctrl: "DateTimePicker"
		},
		"numeric": {
			//			operators: ["EQ", "BT", "LE", "LT", "GE", "GT", "NE"],
			ctrl: "input"
		},
		"time": {
			//			operators: ["EQ", "BT", "LE", "LT", "GE", "GT"],
			ctrl: "TimePicker"
		},
		"boolean": {
			//			operators: ["EQ", "NE"],
			ctrl: "select"
		},
		"multi": {
			ctrl: "SmartMultiInput"
		}
	};

	return AHConditionPanel;

});
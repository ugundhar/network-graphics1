sap.ui.define([
	"i2d/ps/networkgraph/util/Constants",
	"sap/ui/core/BusyIndicator",
	"sap/m/Button",
	"sap/ui/model/Filter",
	"sap/suite/ui/commons/networkgraph/ElementStatus",
	"sap/m/MessageToast",
	"sap/base/strings/formatMessage"
], function (CONSTANTS, BusyIndicator, Button, Filter, ElementStatus, MessageToast, formatMessage) {
	"use strict";

	/**
	 * Event handler for loop line mouse enter event.
	 * Sets "HoveredLoopLine" status for hovered loop line and lines of the same loop.
	 * @private 
	 * @param {object} oEvent mouseenter event object
	 */
	var _fnMouseEnter = function (oEvent) {
			var oLineControl = this.byId(oEvent.currentTarget.id),
				aSameLoopLines = this._getSameLoopLines(oLineControl);
			oLineControl.$().removeClass(oLineControl.HIGHLIGHT_CLASS);
			aSameLoopLines.forEach(function (oLine) {
				oLine.$().addClass(CONSTANTS.LINE_STATUS.HOVERED);
			});
		},

		/**
		 * Event handler for loop line mouse leave event.
		 * Sets "Error" status for hovered loop line and lines of the same loop.
		 * @public 
		 * @param {object} oEvent mouseleave event object
		 */
		_fnMouseLeave = function (oEvent) {
			var oLineControl = this.byId(oEvent.currentTarget.id),
				aSameLoopLines = this._getSameLoopLines(oLineControl);
			aSameLoopLines.forEach(function (oLine) {
				oLine.$().removeClass(CONSTANTS.LINE_STATUS.HOVERED);
			});
		};

	return {

		/**
		 * Event handler for detect loop button press.
		 * Toggles "bLoopDetected" view model property and requests for loop lines.
		 * @public
		 * @param {boolean} bIsRefocusRequired is refocus on first loop line required
		 */
		onDetectLoopCBSelectionChange: function (bIsRefocusRequired) {
			var bLoopDetected = this._getViewModel().getProperty("/bLoopDetected");
			if (this.isProjectNotEmpty() && bLoopDetected) {
				this._highlightLoopLines(bIsRefocusRequired);
			} else {
				this._removeLoopLinesHighlight();
				this._detachLoopLinesEvents();
			}
			if (this._oSmartFilterBar.getFilterData()._CUSTOM.bLoopDetected !== bLoopDetected) {
				this.changeFilterData("bLoopDetected");
			}
			this._updateMap();
			this._updateInnerAppState();
		},

		/**
		 * Requests for loop lines.
		 * Highligst lines and attaches event handlers.
		 * @private
		 * @param {boolean} bIsRefocusRequired is refocus on first loop line required
		 */
		_highlightLoopLines: function (bIsRefocusRequired) {
			var sProject = this._sProject || "",
				sProjectNetwork = this._sProjectNetwork || "",
				sWBSElement = this._sWBSElement || "",
				oModel = this._getNetworkModel(),
				aLoopLines = oModel.getProperty("/loopLines");
			if (!aLoopLines) {
				BusyIndicator.show(0);
				this.getModel().getLoopLines(sProject, sProjectNetwork, sWBSElement).then(function (aLines) {
					oModel.setProperty("/loopLines", aLines);
					if (aLines.length && bIsRefocusRequired) {
						this._oGraph.scrollToElement(this._getLineControl(aLines[0]));
					}
					aLines.forEach(function (oLine) {
						this._addLoopNumberProperty(oLine);
						this._highlightLine(oLine);
						this._attachLoopLinesEvents(oLine);
					}.bind(this));
					var nLoopsAmount = this._countLoopsAmount(aLines);
					this._updateMap();
					this._showLoopMessageToast(nLoopsAmount);
					BusyIndicator.hide();
				}.bind(this)).catch(function (oError) {
					BusyIndicator.hide();
				});
			} else {
				if (aLoopLines.length && bIsRefocusRequired) {
					this._oGraph.scrollToElement(this._getLineControl(aLoopLines[0]));
				}
				aLoopLines.forEach(function (oLine) {
					this._highlightLine(oLine);
					this._attachLoopLinesEvents(oLine);
				}.bind(this));
				var nLoopsAmount = this._countLoopsAmount(aLoopLines);
				this._showLoopMessageToast(nLoopsAmount);
			}
		},

		/**
		 * Removes loop lines highlight by setting Standart status.
		 * @private
		 */
		_removeLoopLinesHighlight: function () {
			var aLines = this._oGraph.getLines();
			aLines.forEach(function (oLine) {
				oLine.setStatus(ElementStatus.Standard);
				oLine.$().removeClass(CONSTANTS.LINE_STATUS.LOOP);
			});
		},

		/** 
		 * Highlights loop lines by setting Error status.
		 * @private
		 * @param {object} oLoopLine loop line data
		 */
		_highlightLine: function (oLoopLine) {
			var oLineToHighlight = this._getLineControl(oLoopLine);
			oLineToHighlight.setStatus(ElementStatus.Error);
			setTimeout(function () {
				oLineToHighlight.$().addClass(CONSTANTS.LINE_STATUS.LOOP);
			}, 0);
		},

		/**
		 * Displays Message Toast with amount of loops.
		 * @private
		 * @param {number} nLoopsAmount number of loops to be displayed in Message Toast
		 */
		_showLoopMessageToast: function (nLoopsAmount) {
			var sText = this.getResourceBundle().getText("DetectLoopMessageToastText");
			MessageToast.show(formatMessage(sText, nLoopsAmount));
		},

		/**
		 * Counts loop lines amount by line "LoopNumber" property.
		 * @private
		 * @param {Array} aLoopLines array of loop lines data
		 * @returns {number} loops amount
		 */
		_countLoopsAmount: function (aLoopLines) {
			var aLoops = aLoopLines.map(function (oLine) {
				return oLine.LoopNumber;
			});

			if (!aLoops.length) {
				return 0;
			}

			var aUniqueLoops = aLoops.filter(function (nLoopNumber, index, aLoopNumbers) {
				return aLoopNumbers.indexOf(nLoopNumber) === index;
			});

			return aUniqueLoops.length;
		},

		/**
		 * Attaches hover events to loop line.
		 * @private
		 * @param {object} oLoopLine loop line data
		 */
		_attachLoopLinesEvents: function (oLoopLine) {
			var oModel = this._getNetworkModel(),
				oLineControl = this._getLineControl(oLoopLine),
				sPath = oLineControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getPath(),
				fnMouseEnter = _fnMouseEnter.bind(this),
				fnMouseLeave = _fnMouseLeave.bind(this);

			if (!oLineControl) {
				return;
			}

			if (oModel.getProperty(sPath + "/fnMouseEnter") || oModel.getProperty(sPath + "/fnMouseLeave")) {
				return;
			}

			oModel.setProperty(sPath + "/fnMouseEnter", fnMouseEnter);
			oModel.setProperty(sPath + "/fnMouseLeave", fnMouseLeave);

			oLineControl.attachBrowserEvent("mouseenter", fnMouseEnter);
			oLineControl.attachBrowserEvent("mouseleave", fnMouseLeave);
		},

		/**
		 * Detaches hover events from loop lines.
		 * @private
		 */
		_detachLoopLinesEvents: function () {
			var aLoopLines = this._getNetworkModel().getProperty("/loopLines");
			if (aLoopLines && aLoopLines.length) {
				aLoopLines.forEach(function (oLoopLine) {
					var oLineControl = this._getLineControl(oLoopLine),
						fnMouseEnter = oLineControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getProperty("fnMouseEnter"),
						fnMouseLeave = oLineControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getProperty("fnMouseLeave");
					oLineControl.detachBrowserEvent("mouseenter", fnMouseEnter);
					oLineControl.detachBrowserEvent("mouseleave", fnMouseLeave);
					this._removeEventHandlersFromModel(oLineControl);
				}.bind(this));
			}
		},

		/**
		 * Returns line controls of the same loop.
		 * @private
		 * @param {sap.suite.ui.commons.networkgraph.Line} oLineControl line control
		 * @returns {Array} array of same loop lines controls
		 */
		_getSameLoopLines: function (oLineControl) {
			var aLoopLines = this._getNetworkModel().getProperty("/loopLines"),
				aLoopNumbers = oLineControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getObject().LoopNumber,
				aLoopLinesControls = [];

			aLoopLines.forEach(function (oLoopLine) {
				aLoopNumbers.forEach(function (nLoopNumber) {
					if (oLoopLine.LoopNumber === nLoopNumber) {
						aLoopLinesControls.push(this._getLineControl(oLoopLine));
					}
				}.bind(this));
			}.bind(this));

			return aLoopLinesControls;
		},

		/**
		 * Adds "LoopNumber" property to line data.
		 * @private
		 * @param {object} oLineData loop line data
		 */
		_addLoopNumberProperty: function (oLineData) {
			var oModel = this._getNetworkModel(),
				oLineControl = this._getLineControl(oLineData),
				nLoopNumber = oLineData.LoopNumber,
				sPath = oLineControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getPath(),
				aLoopNumbers = oModel.getProperty(sPath + "/LoopNumber") || [];

			aLoopNumbers.push(nLoopNumber);

			oModel.setProperty(sPath + "/LoopNumber", aLoopNumbers);
		},

		/**
		 * Removes event handlers from view model.
		 * @private
		 * @param {sap.suite.ui.commons.networkgraph.Line} oLineControl line control
		 */
		_removeEventHandlersFromModel: function (oLineControl) {
			var oModel = this._getNetworkModel(),
				oLineData = oLineControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getObject(),
				sPath = oLineControl.getBindingContext(CONSTANTS.MODELS.NETWORK_MODEL_NAME).getPath();

			delete oLineData.fnMouseEnter;
			delete oLineData.fnMouseLeave;

			oModel.setProperty(sPath, oLineData);
		},

		/**
		 * Returns loop connectors hover events to line control.
		 * @private
		 * @param {object} oLineData loop line data
		 */
		_updateLineHoverEvents: function (oLineData) {
			var oLineControl = this._getLineControl(oLineData),
				fnMouseEnter = oLineData.fnMouseEnter,
				fnMouseLeave = oLineData.fnMouseLeave;

			if (!fnMouseLeave || !fnMouseEnter) {
				return;
			}
			this._highlightLine(oLineData);
			oLineControl.attachBrowserEvent("mouseenter", fnMouseEnter);
			oLineControl.attachBrowserEvent("mouseleave", fnMouseLeave);
		}

	};

});
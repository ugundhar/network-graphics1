sap.ui.define([
	"i2d/ps/networkgraph/util/Constants",
	"sap/ui/core/format/DateFormat",
	"sap/base/strings/formatMessage",
	"sap/ui/core/IconColor",
	"sap/ui/core/theming/Parameters"
], function (CONSTANTS, DateFormat, formatMessage, IconColor, Parameters) {
	"use strict";

	var _oResourceBundle;

	/**
	 * Returns format date.
	 * @param {string} sDate date
	 * @public
	 * @returns {string} format date
	 */
	function getDateFormat(sDate) {
		if (Number(sDate) === 0) {
			return _oResourceBundle.getText("EmptyValueText");
		} else {
			var oDateInstanceForParse = DateFormat.getDateInstance({
					"pattern": "YYYYMMdd"
				}),
				oDateInstanceForFormat = DateFormat.getDateInstance(),
				oDate = oDateInstanceForParse.parse(sDate);
			return oDateInstanceForFormat.format(oDate);
		}
	}

	return {

		/**
		 * Called when formatter is initialized during the startup of the app.
		 * @param  {sap.ui.model.resource.ResourceModel} oResourceBundle Resource bundle with all translated texts
		 */
		init: function (oResourceBundle) {
			_oResourceBundle = oResourceBundle;
		},

		/**
		 * Returns boolean visibility value for indicators in node.
		 * @param {object} oStaticAttributtes static attributes object
		 * @public
		 * @returns {boolean} visibility value
		 */
		getFlagsVisibility: function (oStaticAttributtes) {
			if (oStaticAttributtes) {
				var aKeys = Object.keys(oStaticAttributtes);
				return !!aKeys.length;
			}
			return false;
		},

		/**
		 * Returns boolean visibility value for non-boolean attribute.
		 * @param {string} sAttrbuteType attribute type
		 * @public
		 * @returns {boolean} visibility value
		 */
		getAttributeVisibility: function (sAttrbuteType) {
			return sAttrbuteType !== CONSTANTS.ATTRIBUTE_TYPES.BOOLEAN;
		},

		/**
		 * Returns boolean visibility value for boolean attribute.
		 * @param {string} sAttrbuteType attribute type
		 * @public
		 * @returns {boolean} visibility value
		 */
		getBooleanAttributeVisibility: function (sAttrbuteType) {
			return sAttrbuteType === CONSTANTS.ATTRIBUTE_TYPES.BOOLEAN;
		},

		/**
		 * Returns attribute text.
		 * @param {string} sAttrbuteType attribute type
		 * @param {string} sText attribute text
		 * @public
		 * @returns {string} attribute text
		 */
		getAttributeText: function (sAttrbuteType, sText) {
			return sAttrbuteType === CONSTANTS.ATTRIBUTE_TYPES.DATE ? getDateFormat(sText) : sText;
		},

		/**
		 * Returns two dates through slash.
		 * @param {object} oFirstDate date
		 * @param {object} oSecondDate date
		 * @public
		 * @returns {string} two dates through slash
		 */
		getDatesThroughSlash: function (oFirstDate, oSecondDate) {
			var oDateInstanceForFormat = DateFormat.getDateInstance(),
				sEmptyValueText = _oResourceBundle.getText("EmptyValueText"),
				oFirstFormattedDate = oFirstDate ? oDateInstanceForFormat.format(oFirstDate) : sEmptyValueText,
				oSecondFormattedDate = oSecondDate ? oDateInstanceForFormat.format(oSecondDate) : sEmptyValueText,
				sText = _oResourceBundle.getText("TwoValuesThroughSlashes");
			return formatMessage(sText, oFirstFormattedDate, oSecondFormattedDate);
		},

		/**
		 * Returns text with two values using a pattern.
		 * @param {string} sText pattern text
		 * @param {string}  sFirstValue text value
		 * @param {string}  sSecondValues text value
		 * @public
		 * @returns {string} text with two values using a pattern
		 */
		getTwoFormattedValues: function (sText, sFirstValue, sSecondValues) {
			var sEmptyValueText = _oResourceBundle.getText("EmptyValueText");
			return formatMessage(sText, sFirstValue || sEmptyValueText, sSecondValues || sEmptyValueText);
		},

		/**
		 * Returns activity status icon src.
		 * @param {string} sObjectIsConfirmed "X" if object is confirmed, otherwise ""
		 * @param {string}  sObjectIsPartiallyConfirmed "X" if object is partially confirmed, otherwise ""
		 * @public
		 * @returns {string} status icon src
		 */
		getStatusIcon: function (sObjectIsConfirmed, sObjectIsPartiallyConfirmed) {
			if (sObjectIsConfirmed) {
				return "sap-icon://accept";
			}

			if (sObjectIsPartiallyConfirmed) {
				return "sap-icon://complete";
			}

			return "sap-icon://border";
		},

		/**
		 * Returns activity status text.
		 * @param {string} sObjectIsConfirmed "X" if object is confirmed, otherwise ""
		 * @param {string}  sObjectIsPartiallyConfirmed "X" if object is partially confirmed, otherwise ""
		 * @public
		 * @returns {string} status text
		 */
		getStatusText: function (sObjectIsConfirmed, sObjectIsPartiallyConfirmed) {
			var sText = "NotConfirmedStatus";

			if (sObjectIsPartiallyConfirmed) {
				sText = "PartiallyConfirmedStatus";
			}

			if (sObjectIsConfirmed) {
				sText = "ConfirmedStatus";
			}

			return _oResourceBundle.getText(sText);
		},

		/**
		 * Returns "loop detected" text visibility.
		 * @param {boolean} bLoopDetected true if loop is detected, otherwise false
		 * @param {Array} aLoopLines array of lines included in loops
		 * @param {object} oContext context of the selected line
		 * @public
		 * @returns {boolean} visibility value
		 */
		getLoopDetectedTextVisibility: function (bLoopDetected, aLoopLines, oContext) {
			if (bLoopDetected && aLoopLines && oContext) {
				return !!aLoopLines.find(function (oLine) {
					return oLine.PredecessorProjNtwkIntID === oContext.PredecessorProjNtwkIntID &&
						oLine.PredecessorNtwkActyIntID === oContext.PredecessorNtwkActyIntID &&
						oLine.SuccessorProjNtwkIntID === oContext.SuccessorProjNtwkIntID &&
						oLine.SuccessorNtwkActyIntID === oContext.SuccessorNtwkActyIntID;
				});
			} else {
				return false;
			}
		},

		/**
		 * Returns indicator text in plural or singular form.
		 * @param {string} sSingleText i18n key for indicator text in singular form
		 * @param {string} sMultiText i18n key for indicator text in plural form
		 * @param {string} sNoIndicatorText i18n key for empty indicator text
		 * @param {string} nNumber indicator number
		 * @public
		 * @returns {string} indicator text
		 */
		getIndicatorText: function (sSingleText, sMultiText, sNoIndicatorText, nNumber) {
			var sText;
			switch (nNumber) {
			case 0:
			case undefined:
				sText = sNoIndicatorText;
				break;
			case 1:
				sText = sSingleText;
				break;
			default:
				sText = sMultiText;
				break;
			}
			return formatMessage(sText, nNumber);
		},

		/**
		 * Returns highlight menu button text.
		 * @param {string} sHighlightType highlight type
		 * @public
		 * @returns {string} highlight menu button text
		 */
		getHighlightButtonText: function (sHighlightType) {
			var sText = "";
			switch (CONSTANTS.HIGHLIGHT_FILTER[sHighlightType]) {
			case CONSTANTS.HIGHLIGHT_FILTER.COST:
				sText = "CostTypeHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.SERVICE:
				sText = "ServiceTypeHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.INTERNAL:
				sText = "InternalTypeHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.EXTERNAL:
				sText = "ExternalTypeHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.DUE_TO_START:
				sText = "DueToStartDelayHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.DUE_TO_END:
				sText = "DueToFinishDelayHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.OVERDUE_TO_START:
				sText = "OverdueToStartDelayHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.OVERDUE_TO_END:
				sText = "OverdueToFinishDelayHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.WO_SUCCESSORS:
				sText = "SuccessorsHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.WO_PREDECESSORS:
				sText = "PredecessorsHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.NO_HIGHLIGHT:
				sText = "ResetHighlight";
				break;
			case CONSTANTS.HIGHLIGHT_FILTER.ADV_HIGHLIGHT:
				sText = "AdvancedHighlight";
				break;
			}
			return _oResourceBundle.getText(sText);
		},

		/**
		 * Returns assigned object icon color.
		 * @param {boolean} bNodeSelected is node selected
		 * @param {string} sValue assigned object or not
		 * @public
		 * @returns {string} icon color 
		 */
		getAssignedObjColor: function (bNodeSelected, sValue) {
			var bIsObjAssigned = !!sValue;
			if (bNodeSelected && bIsObjAssigned) {
				return IconColor.Contrast;
			} else if (bNodeSelected && !bIsObjAssigned) {
				return Parameters.get("sapUiIndication8TextColor");
			} else if (!bNodeSelected && bIsObjAssigned) {
				return IconColor.Default;
			} else {
				return IconColor.NonInteractive;
			}
		},

		getNetworkGroupTitle: function (sProjectNetwork, sSuperiorProjectNetwork, sNetworkActivity) {
			var sKey = sSuperiorProjectNetwork ? "NetworkGroupNameWithSubnetwork" : "NetworkGroupName",
				sText = _oResourceBundle.getText(sKey);
			return formatMessage(sText, sProjectNetwork, sSuperiorProjectNetwork, sNetworkActivity);
		},

		getLegendColor: function (sColor) {
			return Parameters.get(sColor);
		}
	};
});
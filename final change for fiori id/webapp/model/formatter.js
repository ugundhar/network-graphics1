sap.ui.define([], function () {
	"use strict";

	return {
		/**
		 * Formats a date to dd.MM.yyyy format
		 * @param {Date|string} oDate - Date to format
		 * @returns {string} Formatted date string
		 */
		formatDateOnly: function(oDate) {
			if (!oDate) return "-"; // Handle null/undefined dates
			// Check if it's already a Date object, otherwise try to parse (robustness)
			var d = oDate instanceof Date ? oDate : new Date(oDate);
			if (isNaN(d.getTime())) { // Check if date is valid
				return "-";
			}
			var day = String(d.getDate()).padStart(2, "0");
			var month = String(d.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
			var year = d.getFullYear();
			return day + "." + month + "." + year;
		},
		
		/**
		 * Maps the OData relationship type to display type
		 * @param {string} sOriginalType - Original type code (NF, AF, etc.)
		 * @returns {string} Mapped relationship type for display
		 */
		mapRelationshipType: function(sOriginalType) {
			switch (sOriginalType) {
				case "NF": return "Finish-to-Start "; // Finish-to-Start (Normalfolge)
				case "AF": return "Start-to-Start"; // Start-to-Start (Anfangfolge)
				case "SF": return "Start-to-Finish"; // Start-to-Finish (Sprungfolge)
				case "EF": return "Finish-to-Finish"; // Finish-to-Finish (Endefolge)
				default:   return sOriginalType; // Fallback if unknown type
			}
		},
		
		/**
		 * Formats the line type based on relationship type
		 * @param {string} sMappedType - Mapped relationship type
		 * @returns {string} Line type (Solid, Dashed, etc.)
		 */
		formatLineType: function(sMappedType) {
			const typeMap = {
				"Finish-to-Start": "Solid",   // Finish-to-Start
				"Start-to-Finish": "Dashed",  // Start-to-Finish
				"Start-to-Start": "Dotted",  // Start-to-Start
				"Finish-to-Finish": "Solid"    // Finish-to-Finish
			};
			return typeMap[sMappedType] || "Solid"; // Default
		},
		
		/**
		 * Formats the line color based on relationship type
		 * @param {string} sMappedType - Mapped relationship type
		 * @returns {string} Color code
		 */
		formatLineColor: function(sMappedType) {
			const colorMap = {
				"Finish-to-Start": "#007DB6", // Blue
				"Start-to-Finish": "#E69A17", // Orange/Yellow
				"Start-to-Start": "#107E3E", // Green
				"Finish-to-Finish": "#B7083F"  // Magenta/Red
			};
			return colorMap[sMappedType] || "#666666"; // Default dark grey
		}
	};
});
sap.ui.define([], function () {
	"use strict";

	return {
		/**
		 * Formats a date to dd.MM.yyyy format
		 * @param {Date|string} oDate - Date to format
		 * @returns {string} Formatted date string
		 */
		formatDateOnly: function(oDate) {
			if (!oDate) return "-"; // Handle null/undefined dates
			// Check if it's already a Date object, otherwise try to parse (robustness)
			var d = oDate instanceof Date ? oDate : new Date(oDate);
			if (isNaN(d.getTime())) { // Check if date is valid
				return "-";
			}
			var day = String(d.getDate()).padStart(2, "0");
			var month = String(d.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
			var year = d.getFullYear();
			return day + "." + month + "." + year;
		},
		
		/**
		 * Maps the OData relationship type to display type
		 * @param {string} sOriginalType - Original type code (NF, AF, etc.)
		 * @returns {string} Mapped relationship type for display
		 */
		mapRelationshipType: function(sOriginalType) {
			switch (sOriginalType) {
				case "NF": return "Finish-to-Start "; // Finish-to-Start (Normalfolge)
				case "AF": return "Start-to-Start"; // Start-to-Start (Anfangfolge)
				case "SF": return "Start-to-Finish"; // Start-to-Finish (Sprungfolge)
				case "EF": return "Finish-to-Finish"; // Finish-to-Finish (Endefolge)
				default:   return sOriginalType; // Fallback if unknown type
			}
		},
		
		/**
		 * Formats the line type based on relationship type
		 * @param {string} sMappedType - Mapped relationship type
		 * @returns {string} Line type (Solid, Dashed, etc.)
		 */
		formatLineType: function(sMappedType) {
			const typeMap = {
				"Finish-to-Start": "Solid",   // Finish-to-Start
				"Start-to-Finish": "Dashed",  // Start-to-Finish
				"Start-to-Start": "Dotted",  // Start-to-Start
				"Finish-to-Finish": "Solid"    // Finish-to-Finish
			};
			return typeMap[sMappedType] || "Solid"; // Default
		},
		
		/**
		 * Formats the line color based on relationship type
		 * @param {string} sMappedType - Mapped relationship type
		 * @returns {string} Color code
		 */
		formatLineColor: function(sMappedType) {
			const colorMap = {
				"Finish-to-Start": "#007DB6", // Blue
				"Start-to-Finish": "#E69A17", // Orange/Yellow
				"Start-to-Start": "#107E3E", // Green
				"Finish-to-Finish": "#B7083F"  // Magenta/Red
			};
			return colorMap[sMappedType] || "#666666"; // Default dark grey
		}
	};
});
sap.ui.define([], function () {
	"use strict";

	return {
		/**
		 * Formats a date to dd.MM.yyyy format
		 * @param {Date|string} oDate - Date to format
		 * @returns {string} Formatted date string
		 */
		formatDateOnly: function(oDate) {
			if (!oDate) return "-"; // Handle null/undefined dates
			// Check if it's already a Date object, otherwise try to parse (robustness)
			var d = oDate instanceof Date ? oDate : new Date(oDate);
			if (isNaN(d.getTime())) { // Check if date is valid
				return "-";
			}
			var day = String(d.getDate()).padStart(2, "0");
			var month = String(d.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
			var year = d.getFullYear();
			return day + "." + month + "." + year;
		},
		
		/**
		 * Maps the OData relationship type to display type
		 * @param {string} sOriginalType - Original type code (NF, AF, etc.)
		 * @returns {string} Mapped relationship type for display
		 */
		mapRelationshipType: function(sOriginalType) {
			switch (sOriginalType) {
				case "NF": return "Finish-to-Start "; // Finish-to-Start (Normalfolge)
				case "AF": return "Start-to-Start"; // Start-to-Start (Anfangfolge)
				case "SF": return "Start-to-Finish"; // Start-to-Finish (Sprungfolge)
				case "EF": return "Finish-to-Finish"; // Finish-to-Finish (Endefolge)
				default:   return sOriginalType; // Fallback if unknown type
			}
		},
		
		/**
		 * Formats the line type based on relationship type
		 * @param {string} sMappedType - Mapped relationship type
		 * @returns {string} Line type (Solid, Dashed, etc.)
		 */
		formatLineType: function(sMappedType) {
			const typeMap = {
				"Finish-to-Start": "Solid",   // Finish-to-Start
				"Start-to-Finish": "Dashed",  // Start-to-Finish
				"Start-to-Start": "Dotted",  // Start-to-Start
				"Finish-to-Finish": "Solid"    // Finish-to-Finish
			};
			return typeMap[sMappedType] || "Solid"; // Default
		},
		
		/**
		 * Formats the line color based on relationship type
		 * @param {string} sMappedType - Mapped relationship type
		 * @returns {string} Color code
		 */
		formatLineColor: function(sMappedType) {
			const colorMap = {
				"Finish-to-Start": "#007DB6", // Blue
				"Start-to-Finish": "#E69A17", // Orange/Yellow
				"Start-to-Start": "#107E3E", // Green
				"Finish-to-Finish": "#B7083F"  // Magenta/Red
			};
			return colorMap[sMappedType] || "#666666"; // Default dark grey
		}
	};
});

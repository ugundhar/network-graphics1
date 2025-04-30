sap.ui.define([
	"sap/ui/base/Object",
	"com/odata/odata/model/formatter"
], function (BaseObject, formatter) {
	"use strict";

	return BaseObject.extend("com.odata.odata.model.GraphBuilder", {
		
		constructor: function() {
			this._formatter = formatter;
		},
		
		/**
		 * Builds a graph data structure from operations and relationships
		 * @param {Array} aOperations - Array of operations
		 * @param {Array} aRelationships - Array of relationships
		 * @returns {Object} Graph data structure with nodes and lines
		 */
		buildGraphData: function(aOperations, aRelationships) {
			var oGraphicsData = {
				nodes: [],
				lines: []
			};
			
			// Create maps for efficient lookup
			var oNodeKeyMap = new Map(); // Maps original RoutingNode -> unique prefixed key
			var oNodeDataMap = new Map(); // Maps unique prefixed key -> full node data object
			
			// Create a map of orders for color assignment
			var oOrderMap = new Map();
			var aOrderColors = ["#0070f2", "#107e3e", "#b7083f", "#9c6500", "#6a4da9", "#5F9EA0", "#8B4513", "#2F4F4F", "#4682B4", "#DC143C", "#FF8C00", "#2E8B57"];
			
			// Assign colors to orders
			aOperations.forEach(function(oOperation) {
				if (oOperation.MaintenanceOrder && !oOrderMap.has(oOperation.MaintenanceOrder)) {
					var iColorIndex = oOrderMap.size % aOrderColors.length;
					oOrderMap.set(oOperation.MaintenanceOrder, { color: aOrderColors[iColorIndex], index: oOrderMap.size });
				}
			});
			
			// Create nodes from operations
			this._createNodes(aOperations, oOrderMap, oNodeKeyMap, oNodeDataMap, oGraphicsData.nodes);
			
			// Create lines from relationships
			this._createLines(aRelationships, oNodeKeyMap, oNodeDataMap, oGraphicsData.lines);
			
			// Remove duplicate lines if any
			oGraphicsData.lines = this._removeDuplicateLines(oGraphicsData.lines);
			
			return oGraphicsData;
		},
		
		/**
		 * Creates nodes from operations
		 * @private
		 */
		_createNodes: function(aOperations, oOrderMap, oNodeKeyMap, oNodeDataMap, aNodes) {
			var that = this;
			
			aOperations.forEach(function(oOperation) {
				if (!oOperation.MaintenanceOrder || !oOperation.MaintenanceOrderRoutingNode) {
					console.warn("Skipping operation due to missing Order or RoutingNode:", oOperation);
					return; // Skip nodes with missing essential keys
				}
				
				var oOrderInfo = oOrderMap.get(oOperation.MaintenanceOrder);
				var sOrderColor = oOrderInfo ? oOrderInfo.color : "#888888"; // Default grey if order somehow missed map
				
				// Unique key combining Order and RoutingNode to handle same RoutingNode across different orders
				var sUniqueKey = oOperation.MaintenanceOrder + "_" + oOperation.MaintenanceOrderRoutingNode;
				
				oNodeKeyMap.set(oOperation.MaintenanceOrderRoutingNode, sUniqueKey); // Store mapping for relationships
				
				var sEarliestStart = that._formatter.formatDateOnly(oOperation.OpErlstSchedldExecStrtDte);
				var sEarliestFinish = that._formatter.formatDateOnly(oOperation.OpErlstSchedldExecEndDte);
				var sLatestStart = that._formatter.formatDateOnly(oOperation.OpLtstSchedldExecStrtDte);
				var sLatestFinish = that._formatter.formatDateOnly(oOperation.OpLtstSchedldExecEndDte);
				
				// Include Order number in the title for clarity
				var sTitle = oOperation.MaintenanceOrder + " / " + oOperation.MaintenanceOrderOperation;
				
				var oNodeData = {
					key: sUniqueKey,
					title: sTitle,
					attributes: [
						{ label: "EarliestStart / EarliestFinish", value: sEarliestStart + " / " + sEarliestFinish },
						{ label: "LatestStart / LatestFinish", value: sLatestStart + " / " + sLatestFinish },
						{ label: "Status", value: oOperation.SystemStatusText || "-" },
						{ label: "Work Ctr", value: oOperation.WorkCenter || "-" },
						{ label: "Qty", value: oOperation.MaintOrderOperationQuantity || "-" },
						{ label: "Ctrl Key/ Description", value: oOperation.OperationControlKey + "/" + oOperation.OperationDescription  }
					],
					icon: "sap-icon://activities",
					status: "Success",
					statusColor: sOrderColor,
					MaintenanceOrder: oOperation.MaintenanceOrder // Store order number directly for easy lookup later
				};
				
				aNodes.push(oNodeData);
				oNodeDataMap.set(sUniqueKey, oNodeData); // Add node data to lookup map
			});
		},
		
		/**
		 * Creates lines from relationships
		 * @private
		 */
		_createLines: function(aRelationships, oNodeKeyMap, oNodeDataMap, aLines) {
			var that = this;
			
			aRelationships.forEach(function(oRelationship) {
				// Construct the unique keys based on the relationship's own MaintenanceOrder
				var sFromOrderPrefix = oRelationship.MaintenanceOrder + "_";
				var sToOrderPrefix = oRelationship.MaintenanceOrder + "_";
				
				var sFromKey = sFromOrderPrefix + oRelationship.PredecessorOrderRoutingNode;
				var sToKey = sToOrderPrefix + oRelationship.SuccessorOrderRoutingNode;
				
				// Map the relationship type (e.g., NF to FS)
				var sMappedType = that._formatter.mapRelationshipType(oRelationship.OrderOpRelationshipIntType);
				
				// Check if both nodes exist
				if (oNodeDataMap.has(sFromKey) && oNodeDataMap.has(sToKey)) {
					var oFromNodeData = oNodeDataMap.get(sFromKey);
					var oToNodeData = oNodeDataMap.get(sToKey);
					
					// Only add the line if both nodes belong to the SAME order
					if (oFromNodeData.MaintenanceOrder === oToNodeData.MaintenanceOrder) {
						aLines.push({
							from: sFromKey,
							to: sToKey,
							type: sMappedType,
							customData: [
								{ key: "relationType", value: oRelationship.OrderOpRelationshipIntType },
								{ key: "fromOrder", value: oFromNodeData.MaintenanceOrder },
								{ key: "toOrder", value: oToNodeData.MaintenanceOrder }
							]
						});
					} else {
						console.warn("Skipping INTER-order relationship (feature not visually supported well)");
					}
				}
			});
		},
		
		/**
		 * Removes duplicate lines from the array
		 * @private
		 */
		_removeDuplicateLines: function(aLines) {
			var linesMap = new Map();
			
			aLines.forEach(function(item) {
				// Create a unique key for the line based on from, to, and type
				var lineKey = item.from + "|" + item.to + "|" + item.type;
				if (!linesMap.has(lineKey)) {
					linesMap.set(lineKey, item);
				}
			});
			
			return Array.from(linesMap.values());
		}
	});
}); 
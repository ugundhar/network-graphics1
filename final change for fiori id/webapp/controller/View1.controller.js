// // with multiple interorder relationship




sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/f/library"
], function (Controller, JSONModel, Filter, FilterOperator, MessageBox, fioriLibrary) {
	"use strict";

	return Controller.extend("com.odata.odata.controller.View1", {
		// Initialization
		onInit: function () {
			var oViewModel = new JSONModel({
				results: []
			});
			this.getView().setModel(oViewModel, "operations"); // Holds raw operations data from OData

			// View model for UI state (selected line, etc.)
			var oViewStateModel = new JSONModel({
				selectedLine: null,
				dateView: {
					selectedKey: "BASIC" // Default date view
				},
				grouping: {
					selectedKey: "NONE" // Default grouping
				},
				highlight: {
					selectedKey: "NONE" // Default highlighting
				}
			});
			this.getView().setModel(oViewStateModel, "viewModel");

			// Add selection handling for graph lines (needed for delete/detail view)
			var oGraph = this.byId("graph2");
			if (oGraph) {
				oGraph.attachSelectionChange(this.onGraphSelectionChange.bind(this));
			}

			// Initialize FCL reference after rendering
			this.getView().addEventDelegate({
				onAfterRendering: function () {
					try {
						this.oFCL = this.getView().getParent().getParent();
					} catch (e) {
						console.warn("Could not find Flexible Column Layout on initial rendering. Will try again on interaction.");
						this.oFCL = null;
					}
				}.bind(this)
			});
		},

		// New method to handle multiple orders
		onGetMultipleOrders: function() {
			var sOrderInput = this.byId("orderInput").getValue();
			var aOrderNumbers = sOrderInput.split(",").map(function(item) {
				return item.trim(); // Remove whitespace
			}).filter(function(item) {
				return item !== ""; // Remove empty entries
			});

			if (aOrderNumbers.length === 0) {
				MessageBox.error("Please enter at least one valid order number (comma-separated).");
				return;
			}

			var oModel = this.getView().getModel(); // Default OData Model
			if (!oModel) {
				MessageBox.error("OData Model not found.");
				return;
			}

			// Reset the operations model and hide graph while loading
			var oViewModel = this.getView().getModel("operations");
			oViewModel.setData({ results: [] }); // Reset with an empty array if needed by bindings
			this.getView().byId("graph2").setVisible(false);

			// Use batch processing for efficiency
			oModel.setUseBatch(true);
			this._processMultipleOrders(aOrderNumbers, oModel);
		},

		_processMultipleOrders: function(aOrderNumbers, oModel) {
			var that = this;
			var aBatchRequests = [];
			var aOrderMap = new Map(); // Map groupId to orderNumber

			// Clear previous deferred groups if any (optional but good practice)
			oModel.setDeferredGroups([]);

			// Create batch read requests for each order
			aOrderNumbers.forEach(function(sOrderNumber, iIndex) {
				var sGroupId = "orderGroup" + iIndex; // Unique group ID for each order's requests
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat([sGroupId]));
				aOrderMap.set(sGroupId, sOrderNumber); // Map group ID back to order number

				// 1. Read Operations for this Order
				oModel.read("/MaintenanceOrder('" + sOrderNumber + "')/to_MaintenanceOrderOperation", {
					groupId: sGroupId,
					urlParameters: {
						"$select": "MaintenanceOrder,MaintenanceOrderOperation,OperationDescription,OpErlstSchedldExecStrtDte,OpErlstSchedldExecEndDte,OpLtstSchedldExecStrtDte,OpLtstSchedldExecEndDte,SystemStatusText,WorkCenter,MaintOrderOperationQuantity,OperationControlKey,ControllingArea,OperationWorkCenterTypeCode,ActualWorkQuantity,MaintOrderConfirmation,MaintenanceOrderRoutingNode"
					}
				});

				// 2. Read Relationships for this Order
				var aFilters = [new Filter("MaintenanceOrder", FilterOperator.EQ, sOrderNumber)];
				oModel.read("/MaintOrderOpRelationship", {
					filters: aFilters,
					groupId: sGroupId,
					urlParameters: {
						// Select all fields needed for correct relationship processing
						"$select": "MaintenanceOrder,MaintenanceOrderOperation,MaintOrdOperationIsSuccessor,RelatedMaintenanceOrder,RelatedMaintOrderOperation,OrderOpRelationshipIntType,PredecessorOrderRoutingNode,SuccessorOrderRoutingNode" 
					}
				});

				aBatchRequests.push(sGroupId); // Keep track of group IDs to submit
			});

			// Submit all batch requests
			var aAllOperations = [];
			var aAllRelationships = [];
			var iCompletedRequests = 0;
			var aErrors = [];

			aBatchRequests.forEach(function(sGroupId) {
				oModel.submitChanges({
					groupId: sGroupId,
					success: function(oData, oResponse) {
						var sOrderNumber = aOrderMap.get(sGroupId); // Get the order for this response
						console.log("Successfully fetched data for order:", sOrderNumber);

						// Check response structure carefully - might differ based on OData version/service
						if (oData.__batchResponses && oData.__batchResponses.length >= 2) {
							// Assuming operations are the first response, relationships the second
							if (oData.__batchResponses[0].data && oData.__batchResponses[0].data.results) {
								aAllOperations = aAllOperations.concat(oData.__batchResponses[0].data.results);
							} else {
								console.warn("No operations data found in batch response for order:", sOrderNumber, oData.__batchResponses[0]);
							}
							if (oData.__batchResponses[1].data && oData.__batchResponses[1].data.results) {
								aAllRelationships = aAllRelationships.concat(oData.__batchResponses[1].data.results);
							} else {
								console.warn("No relationship data found in batch response for order:", sOrderNumber, oData.__batchResponses[1]);
							}
						} else {
							console.error("Unexpected batch response structure for order:", sOrderNumber, oData);
							aErrors.push("Unexpected response structure for Order " + sOrderNumber + ".");
						}

						iCompletedRequests++;
						if (iCompletedRequests === aBatchRequests.length) {
							that._finalizeBatchProcessing(aAllOperations, aAllRelationships, aErrors);
						}
					},
					error: function(oError) {
						var sOrderNumber = aOrderMap.get(sGroupId);
						console.error("Error fetching data for order " + sOrderNumber + ":", oError);
						// Try to parse error message if possible
						var sErrorMessage = "Order " + sOrderNumber + ": Request failed.";
						try {
							var errorResponse = JSON.parse(oError.responseText);
							if (errorResponse.error && errorResponse.error.message) {
								sErrorMessage += " " + errorResponse.error.message.value;
							}
						} catch (e) {
							// Ignore parsing error, use generic message
						}
						aErrors.push(sErrorMessage);

						iCompletedRequests++;
						if (iCompletedRequests === aBatchRequests.length) {
							that._finalizeBatchProcessing(aAllOperations, aAllRelationships, aErrors);
						}
					}
				});
			});
		},

		_finalizeBatchProcessing: function(aAllOperations, aAllRelationships, aErrors) {
			// Display any errors that occurred
			if (aErrors.length > 0) {
				MessageBox.error("Errors occurred during data retrieval:\n" + aErrors.join("\n"));
			}

			// Update the operations model (used by other parts like delete logic)
			var oViewModel = this.getView().getModel("operations");
			oViewModel.setData(aAllOperations); // Store the raw combined operations

			// Proceed to build the graph only if we have operations
			if (aAllOperations.length > 0) {
				this._buildGraphData(aAllOperations, aAllRelationships, this);
				this.getView().byId("graph2").setVisible(true);
			} else {
				MessageBox.information("No operations found for the entered order(s).");
				this.getView().byId("graph2").setVisible(false); // Keep graph hidden
				// Clear graph data if necessary
				var oGraphModel = this.getView().getModel("graphicsData");
				if (oGraphModel) {
					oGraphModel.setData({ nodes: [], lines: [] });
				}
			}
		},

		// Deprecated single order fetch - keep if needed, but onGetMultipleOrders is primary now
		onGetCall: function (oEvent) {
			var sMaintenanceOrderNumber = this.getView().byId("orderInput").getValue().split(",")[0].trim(); // Get only the first one if called directly
			if (!sMaintenanceOrderNumber) {
				MessageBox.warning("Please enter an order number.");
				return;
			}
			// Simulate the multiple order call with a single order
			this.onGetMultipleOrders();
		},

		// Deprecated single order helpers - No longer directly called by primary flow
		_getOrderOperations: function (sMaintenanceOrderNumber, oModel) { /* ... keep if fallback needed ... */ },
		_getOperationsRelationShip: function (sMaintenanceOrderNumber, oModel) { /* ... keep if fallback needed ... */ },

		/**
		 * _buildGraphData:
		 * Creates nodes and lines for the graph based on combined operation and relationship data.
		 * Handles relationships both WITHIN and BETWEEN Maintenance Orders.
		 */
		_buildGraphData: function (aOperations, aOperationRelationships, that) { // 'that' is passed for context (e.g., calling formatters)

			var oGraphicsData = {
				nodes: [],
				lines: []
			};

			// Helper to format date to dd.MM.yyyy (no time)
			function formatDateOnly(oDate) {
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
			}

			// Create a map of orders for color assignment
			var oOrderMap = new Map();
			var aOrderColors = ["#0070f2", "#107e3e", "#b7083f", "#9c6500", "#6a4da9", "#5F9EA0", "#8B4513", "#2F4F4F", "#4682B4", "#DC143C", "#FF8C00", "#2E8B57"]; // Added more colors
			aOperations.forEach(function(oOperation) {
				if (oOperation.MaintenanceOrder && !oOrderMap.has(oOperation.MaintenanceOrder)) {
					var iColorIndex = oOrderMap.size % aOrderColors.length;
					oOrderMap.set(oOperation.MaintenanceOrder, { color: aOrderColors[iColorIndex], index: oOrderMap.size });
				}
			});

			// Create maps for efficient lookup during line creation
			// Map unique key (Order_Operation) -> full node data object
			var oNodeDataMap = new Map();

			// --- Create Nodes ---
			aOperations.forEach(function (oOperation) {
				// Ensure essential keys are present
				if (!oOperation.MaintenanceOrder || !oOperation.MaintenanceOrderOperation) {
					console.warn("Skipping operation due to missing Order or Operation key:", oOperation);
					return; 
				}

				var oOrderInfo = oOrderMap.get(oOperation.MaintenanceOrder);
				var sOrderColor = oOrderInfo ? oOrderInfo.color : "#888888";
				// Unique key combining Order and Operation
				var sUniqueKey = oOperation.MaintenanceOrder + "_" + oOperation.MaintenanceOrderOperation;

				// Skip if node already exists (can happen if operation data is duplicated)
				if (oNodeDataMap.has(sUniqueKey)) {
					console.warn("Duplicate node key detected, skipping creation:", sUniqueKey);
					return;
				}

				var sEarliestStart = formatDateOnly(oOperation.OpErlstSchedldExecStrtDte);
				var sEarliestFinish = formatDateOnly(oOperation.OpErlstSchedldExecEndDte);
				var sLatestStart = formatDateOnly(oOperation.OpLtstSchedldExecStrtDte);
				var sLatestFinish = formatDateOnly(oOperation.OpLtstSchedldExecEndDte);
				// Include Order number in the title for clarity
				var sTitle = oOperation.MaintenanceOrder + " / " + oOperation.MaintenanceOrderOperation;

				var oNodeData = {
					key: sUniqueKey,
					title: sTitle,
					attributes: [
						// { label: "Order", value: oOperation.MaintenanceOrder },
						// { label: "Operation", value: oOperation.MaintenanceOrderOperation },
						// { label: "Description", value: oOperation.OperationDescription || "-" }, // Added Description
						{ label: "EarliestStart / EarliestFinish", value: sEarliestStart + " / " + sEarliestFinish },
						{ label: "LatestStart / LatestFinish", value: sLatestStart + " / " + sLatestFinish },
						{ label: "Status", value: oOperation.SystemStatusText || "-" },
						{ label: "Work Ctr", value: oOperation.WorkCenter || "-" }, // Added Work Center
						{ label: "Qty", value: oOperation.MaintOrderOperationQuantity || "-" },
						{ label: "Ctrl Key/ Description", value: oOperation.OperationControlKey + "/" + oOperation.OperationDescription  },
						// { label: "ControllingArea", value: oOperation.ControllingArea || "-" },
						// { label: "WorkCenterTypeCode", value: oOperation.OperationWorkCenterTypeCode || "-" },
						// { label: "ActualWorkQuantity", value: oOperation.ActualWorkQuantity || "-" },
						// { label: "MaintOrderConfirmation", value: oOperation.MaintOrderConfirmation || "-" }
					],
					icon: "sap-icon://activities", // Changed icon
					status: "Success", // Status could be mapped from SystemStatusText if needed
					statusColor: sOrderColor, // Color node border based on order
					MaintenanceOrder: oOperation.MaintenanceOrder // Store order number directly for easy lookup later
				};
				oGraphicsData.nodes.push(oNodeData);
				oNodeDataMap.set(sUniqueKey, oNodeData); // Add node data to lookup map
			});

			// --- Create Lines (Relationships) ---
			aOperationRelationships.forEach(function (oRelationship) {
				// Determine Predecessor and Successor based on the MaintOrdOperationIsSuccessor flag
				var predecessorOrder, predecessorOperation, successorOrder, successorOperation;

				if (oRelationship.MaintOrdOperationIsSuccessor === true) {
					// The current operation (MaintenanceOrder/Operation) is the SUCCESSOR
					// The related operation (RelatedMaintenanceOrder/Operation) is the PREDECESSOR
					successorOrder = oRelationship.MaintenanceOrder;
					successorOperation = oRelationship.MaintenanceOrderOperation;
					predecessorOrder = oRelationship.RelatedMaintenanceOrder;
					predecessorOperation = oRelationship.RelatedMaintOrderOperation;
				} else {
					// The current operation (MaintenanceOrder/Operation) is the PREDECESSOR
					// The related operation (RelatedMaintenanceOrder/Operation) is the SUCCESSOR
					predecessorOrder = oRelationship.MaintenanceOrder;
					predecessorOperation = oRelationship.MaintenanceOrderOperation;
					successorOrder = oRelationship.RelatedMaintenanceOrder;
					successorOperation = oRelationship.RelatedMaintOrderOperation;
				}

				// Construct the unique keys for the graph nodes
				var sFromKey = predecessorOrder + "_" + predecessorOperation;
				var sToKey = successorOrder + "_" + successorOperation;

				// Map the relationship type (e.g., NF to FS)
				var mappedType = that._mapRelationshipType(oRelationship.OrderOpRelationshipIntType);
				var lineType = that.formatLineType(mappedType);
				var lineColor = that.formatLineColor(mappedType);

				// Check if both the 'from' and 'to' nodes actually exist in our collected node data
				if (oNodeDataMap.has(sFromKey) && oNodeDataMap.has(sToKey)) {
					// Add the line - INTER-ORDER relationships are now INCLUDED
					oGraphicsData.lines.push({
						from: sFromKey,
						to: sToKey,
						type: lineType,
						type: mappedType,
						status: lineType,  // Set the line style (Solid, Dashed, Dotted)
						color: lineColor,  // Set the line color based on type
						// Store original type and potentially order info in custom data
						customData: [
							{ key: "relationType", value: oRelationship.OrderOpRelationshipIntType }, // Store original NF, AF etc.
							{ key: "fromOrder", value: predecessorOrder },
							{ key: "toOrder", value: successorOrder }
						]
					});
				} else {
					// Log if a relationship refers to a node that wasn't found/created 
					console.warn("Relationship skipped: Node key not found. From:", sFromKey, "To:", sToKey, "Relationship Data:", oRelationship);
				}
			});

			// Remove potential duplicate lines (if data source could provide duplicates)
			var linesMap = new Map();
			oGraphicsData.lines.forEach(function (item) {
				// Create a unique key for the line based on from, to, and type
				var lineKey = item.from + "|" + item.to + "|" + item.type;
				if (!linesMap.has(lineKey)) {
					linesMap.set(lineKey, item);
				}
			});
			oGraphicsData.lines = Array.from(linesMap.values());

			// --- Set Model for the Graph ---
			var oGraphModel = this.getView().getModel("graphicsData");
			if (!oGraphModel) {
				oGraphModel = new JSONModel();
				this.getView().setModel(oGraphModel, "graphicsData");
			}
			oGraphModel.setSizeLimit(Math.max(aOperations.length * 2, 1000)); // Increase size limit based on data
			oGraphModel.setData(oGraphicsData);

			console.log("Graph data built:", oGraphicsData);
		},

		// --- Filter Dropdown Handlers ---

		/**
		 * Event handler for Date View ComboBox change
		 * Changes the node attributes display based on date view selection
		 * @param {sap.ui.base.Event} oEvent ComboBox change event
		 */
		onDateViewComboBoxChange: function(oEvent) {
			var sSelectedKey = oEvent.getSource().getSelectedKey();
			var oViewModel = this.getView().getModel("viewModel");
			
			// Store the current view selection
			if (!oViewModel.getProperty("/dateView")) {
				oViewModel.setProperty("/dateView", {});
			}
			oViewModel.setProperty("/dateView/selectedKey", sSelectedKey);

			// If no graph data or graph not visible, exit early
			if (!this.getView().byId("graph2").getVisible()) {
				return;
			}

			// Update the node attributes based on the selected date view
			var oGraphModel = this.getView().getModel("graphicsData");
			var aNodes = oGraphModel.getProperty("/nodes");
			
			// Process each node to update its attributes based on the selected view
			aNodes.forEach(function(oNode) {
				switch(sSelectedKey) {
					case "ACTUAL":
						// Show actual dates in attributes
						this._updateNodeForActualDatesView(oNode);
						break;
					case "FORECAST":
						// Show forecast dates in attributes
						this._updateNodeForForecastDatesView(oNode);
						break;
					case "PLAN_ACTUAL":
						// Show plan vs. actual comparison in attributes
						this._updateNodeForPlanActualView(oNode);
						break;
					case "BASIC":
					default:
						// Basic view (default) - already handled in _buildGraphData
						break;
				}
			}.bind(this));
			
			// Update the model with modified nodes
			oGraphModel.setProperty("/nodes", aNodes);
			
			// Force graph to refresh
			this.getView().byId("graph2").rerender();
		},

		/**
		 * Updates node attributes for Actual Dates View
		 * @private
		 * @param {Object} oNode The node to update
		 */
		_updateNodeForActualDatesView: function(oNode) {
			// Here we would typically get the actual dates from OData
			// For this implementation, we'll use the existing attributes but modify them for actual dates
			var aNewAttributes = [];
			oNode.attributes.forEach(function(oAttribute) {
				var oNewAttribute = { label: oAttribute.label, value: oAttribute.value };
				
				// Replace earliest/latest dates with actual dates if this is a date attribute
				if (oAttribute.label.includes("EarliestStart") || oAttribute.label.includes("LatestStart")) {
					oNewAttribute.label = "Actual Start / Actual Finish";
					// In a real implementation, we would use actual dates from backend
					oNewAttribute.value = "Actual dates would appear here";
				}
				aNewAttributes.push(oNewAttribute);
			});
			oNode.attributes = aNewAttributes;
		},

		/**
		 * Updates node attributes for Forecast Dates View
		 * @private
		 * @param {Object} oNode The node to update
		 */
		_updateNodeForForecastDatesView: function(oNode) {
			// Similar to actual dates, but for forecast dates
			var aNewAttributes = [];
			oNode.attributes.forEach(function(oAttribute) {
				var oNewAttribute = { label: oAttribute.label, value: oAttribute.value };
				
				if (oAttribute.label.includes("EarliestStart") || oAttribute.label.includes("LatestStart")) {
					oNewAttribute.label = "Forecast Start / Forecast Finish";
					// In a real implementation, we would use forecast dates from backend
					oNewAttribute.value = "Forecast dates would appear here";
				}
				aNewAttributes.push(oNewAttribute);
			});
			oNode.attributes = aNewAttributes;
		},

		/**
		 * Updates node attributes for Plan-Actual Comparison View
		 * @private
		 * @param {Object} oNode The node to update
		 */
		_updateNodeForPlanActualView: function(oNode) {
			// Add comparison between planned and actual dates
			var aNewAttributes = [];
			oNode.attributes.forEach(function(oAttribute) {
				var oNewAttribute = { label: oAttribute.label, value: oAttribute.value };
				
				if (oAttribute.label.includes("EarliestStart")) {
					aNewAttributes.push(oNewAttribute); // Keep the planned dates
					// Add actual dates for comparison
					aNewAttributes.push({
						label: "Actual Start / Actual Finish",
						value: "Actual dates for comparison"
					});
					// Add variance calculation
					aNewAttributes.push({
						label: "Variance (days)",
						value: "Plan-Actual variance"
					});
				} else if (!oAttribute.label.includes("LatestStart")) {
					// Skip LatestStart attributes as we've already handled comparison
					aNewAttributes.push(oNewAttribute);
				}
			});
			oNode.attributes = aNewAttributes;
		},

		/**
		 * Event handler for Group ComboBox change
		 * Changes the node grouping based on selection
		 * @param {sap.ui.base.Event} oEvent ComboBox change event
		 */
		onGroupComboBoxChange: function(oEvent) {
			var sSelectedKey = oEvent.getSource().getSelectedKey();
			var oViewModel = this.getView().getModel("viewModel");
			
			// Store the current grouping selection
			if (!oViewModel.getProperty("/grouping")) {
				oViewModel.setProperty("/grouping", {});
			}
			oViewModel.setProperty("/grouping/selectedKey", sSelectedKey);
			
			// If no graph data or graph not visible, exit early
			if (!this.getView().byId("graph2").getVisible()) {
				return;
			}
			
			var oGraph = this.getView().byId("graph2");
			var oGraphModel = this.getView().getModel("graphicsData");
			var aNodes = oGraphModel.getProperty("/nodes");
			
			// Remove any existing groups
			if (oGraph.getGroups()) {
				oGraph.destroyGroups();
			}
			
			// Apply grouping based on selected key
			switch(sSelectedKey) {
				case "NETWORK":
					this._applyNetworkGrouping(aNodes, oGraph);
					break;
				case "WBS":
					this._applyWBSGrouping(aNodes, oGraph);
					break;
				case "NONE":
				default:
					// No grouping - reset any grouping
					aNodes.forEach(function(oNode) {
						oNode.groupKey = "";
					});
					oGraphModel.setProperty("/nodes", aNodes);
					break;
			}
			
			// Force graph to refresh
			oGraph.rerender();
		},

		/**
		 * Apply grouping by network
		 * @private
		 * @param {Array} aNodes The nodes to group
		 * @param {sap.suite.ui.commons.networkgraph.Graph} oGraph The graph control
		 */
		_applyNetworkGrouping: function(aNodes, oGraph) {
			var that = this;
			// Group nodes by MaintenanceOrder
			var oOrderGroups = {};
			
			// Create grouping
			aNodes.forEach(function(oNode) {
				var sOrderNumber = oNode.MaintenanceOrder;
				oNode.groupKey = sOrderNumber; // Assign group key to node
				
				// Create group if it doesn't exist
				if (!oOrderGroups[sOrderNumber]) {
					oOrderGroups[sOrderNumber] = {
						key: sOrderNumber,
						title: "Order: " + sOrderNumber
					};
				}
			});
			
			// Create graph groups
			Object.values(oOrderGroups).forEach(function(oGroupData) {
				var oGroup = new sap.suite.ui.commons.networkgraph.Group({
					key: oGroupData.key,
					title: oGroupData.title
				});
				oGraph.addGroup(oGroup);
			});
			
			// Update the model
			this.getView().getModel("graphicsData").setProperty("/nodes", aNodes);
		},

		/**
		 * Apply grouping by WBS Element
		 * @private
		 * @param {Array} aNodes The nodes to group 
		 * @param {sap.suite.ui.commons.networkgraph.Graph} oGraph The graph control
		 */
		_applyWBSGrouping: function(aNodes, oGraph) {
			// Grouping by WBS would typically require WBS data from backend
			// For this implementation, we'll group by a dummy WBS attribute
			var oWBSGroups = {
				"WBS1": {
					key: "WBS1",
					title: "WBS Element: Project Phase 1"
				},
				"WBS2": {
					key: "WBS2",
					title: "WBS Element: Project Phase 2"
				}
			};
			
			// Assign nodes to WBS groups based on some criteria (e.g. Operation number ranges)
			aNodes.forEach(function(oNode) {
				var sOpNum = oNode.key.split("_")[1];
				var sGroupKey;
				
				// Simplified logic - evens to WBS1, odds to WBS2
				if (parseInt(sOpNum) % 2 === 0) {
					sGroupKey = "WBS1";
				} else {
					sGroupKey = "WBS2";
				}
				
				oNode.groupKey = sGroupKey;
			});
			
			// Create graph groups
			Object.values(oWBSGroups).forEach(function(oGroupData) {
				var oGroup = new sap.suite.ui.commons.networkgraph.Group({
					key: oGroupData.key,
					title: oGroupData.title
				});
				oGraph.addGroup(oGroup);
			});
			
			// Update the model
			this.getView().getModel("graphicsData").setProperty("/nodes", aNodes);
		},

		/**
		 * Event handler for Highlight ComboBox change
		 * Applies highlighting to nodes based on selection
		 * @param {sap.ui.base.Event} oEvent ComboBox change event
		 */
		onHighlightComboBoxChange: function(oEvent) {
			var sSelectedKey = oEvent.getSource().getSelectedKey();
			var oViewModel = this.getView().getModel("viewModel");
			
			// Store the current highlighting selection
			if (!oViewModel.getProperty("/highlight")) {
				oViewModel.setProperty("/highlight", {});
			}
			oViewModel.setProperty("/highlight/selectedKey", sSelectedKey);
			
			// If no graph data or graph not visible, exit early
			if (!this.getView().byId("graph2").getVisible()) {
				return;
			}
			
			var oGraphModel = this.getView().getModel("graphicsData");
			var aNodes = oGraphModel.getProperty("/nodes");
			
			// Reset all nodes to default status first
			aNodes.forEach(function(oNode) {
				oNode.status = "Success"; // Reset to default status
			});
			
			// Apply highlighting based on selected key
			switch(sSelectedKey) {
				case "WO_PREDECESSORS":
					this._highlightNodesWithoutPredecessors(aNodes, oGraphModel);
					break;
				case "WO_SUCCESSORS":
					this._highlightNodesWithoutSuccessors(aNodes, oGraphModel);
					break;
				case "BY_TYPE":
					this._highlightNodesByType(aNodes, oGraphModel);
					break;
				case "WITH_DELAYS":
					this._highlightNodesWithDelays(aNodes, oGraphModel);
					break;
				case "ADVANCED":
					// Advanced highlighting would typically open a dialog
					sap.m.MessageToast.show("Advanced highlighting would open a configuration dialog");
					break;
				case "NONE":
				default:
					// No highlighting - already reset nodes above
					break;
			}
			
			// Update the model with modified nodes
			oGraphModel.setProperty("/nodes", aNodes);
			
			// Force graph to refresh
			this.getView().byId("graph2").rerender();
		},

		/**
		 * Highlight nodes without predecessors
		 * @private
		 * @param {Array} aNodes The nodes to process
		 * @param {sap.ui.model.json.JSONModel} oGraphModel The graph model
		 */
		_highlightNodesWithoutPredecessors: function(aNodes, oGraphModel) {
			var aLines = oGraphModel.getProperty("/lines");
			var aTargetNodes = []; // Nodes that have incoming lines (successors)
			
			// Find all nodes that are targets of lines
			aLines.forEach(function(oLine) {
				aTargetNodes.push(oLine.to);
			});
			
			// Highlight nodes that don't appear in the target nodes list
			aNodes.forEach(function(oNode) {
				if (aTargetNodes.indexOf(oNode.key) === -1) {
					oNode.status = "Warning"; // Node without predecessors
				}
			});
		},

		/**
		 * Highlight nodes without successors
		 * @private
		 * @param {Array} aNodes The nodes to process
		 * @param {sap.ui.model.json.JSONModel} oGraphModel The graph model
		 */
		_highlightNodesWithoutSuccessors: function(aNodes, oGraphModel) {
			var aLines = oGraphModel.getProperty("/lines");
			var aSourceNodes = []; // Nodes that have outgoing lines (predecessors)
			
			// Find all nodes that are sources of lines
			aLines.forEach(function(oLine) {
				aSourceNodes.push(oLine.from);
			});
			
			// Highlight nodes that don't appear in the source nodes list
			aNodes.forEach(function(oNode) {
				if (aSourceNodes.indexOf(oNode.key) === -1) {
					oNode.status = "Warning"; // Node without successors
				}
			});
		},

		/**
		 * Highlight nodes by type (e.g., based on Control Key)
		 * @private
		 * @param {Array} aNodes The nodes to process
		 * @param {sap.ui.model.json.JSONModel} oGraphModel The graph model
		 */
		_highlightNodesByType: function(aNodes, oGraphModel) {
			// Highlight based on Control Key attribute
			aNodes.forEach(function(oNode) {
				var sControlKey = "";
				
				// Find Control Key in attributes
				oNode.attributes.forEach(function(oAttribute) {
					if (oAttribute.label.indexOf("Ctrl Key") !== -1) {
						sControlKey = oAttribute.value.split("/")[0]; // Get the control key before the slash
					}
				});
				
				// Highlight based on control key
				switch(sControlKey) {
					case "PS01":
						oNode.status = "Warning"; // Yellow
						break;
					case "PM01":
						oNode.status = "Error"; // Red
						break;
					case "SM01":
						oNode.status = "Information"; // Blue
						break;
					// Add more types as needed
					default:
						// Keep default status
						break;
				}
			});
		},

		/**
		 * Highlight nodes with delays (simulated)
		 * @private
		 * @param {Array} aNodes The nodes to process
		 * @param {sap.ui.model.json.JSONModel} oGraphModel The graph model
		 */
		_highlightNodesWithDelays: function(aNodes, oGraphModel) {
			// In a real implementation, this would check actual vs. planned dates
			// For this sample, we'll randomly highlight some nodes
			aNodes.forEach(function(oNode, iIndex) {
				// Simulate some nodes with delays (every third node)
				if (iIndex % 3 === 0) {
					oNode.status = "Error"; // Node with delay
				}
			});
		},

		// Get FCL instance safely
		_getFCL: function() {
			if (!this.oFCL) {
				try {
					// Try to traverse up the view hierarchy to find the FlexibleColumnLayout
					var oParent = this.getView().getParent();
					while (oParent) {
						if (oParent.isA("sap.f.FlexibleColumnLayout")) {
							this.oFCL = oParent;
							break;
						}
						oParent = oParent.getParent();
					}
				} catch (e) {
					console.error("Error finding FlexibleColumnLayout:", e);
					this.oFCL = null;
				}
			}
			if (!this.oFCL) {
				MessageBox.error("Navigation Error: Could not find the Flexible Column Layout container.");
			}
			return this.oFCL;
		},

		// --- Event Handlers ---

		onNodePress: function (oEvent) {
			var oNode = oEvent.getSource();
			var sNodeKey = oNode.getKey(); // This is the unique key (Order_Operation)

			// Retrieve the full node data using the map stored during graph build
			var oGraphModel = this.getView().getModel("graphicsData");
			var oNodeDataMap = oGraphModel.getProperty("/_nodeDataMap"); // Retrieve the map we stored

			if (!oNodeDataMap) {
				// Fallback: Rebuild map if not stored (less efficient)
				oNodeDataMap = oGraphModel.getProperty("/nodes").reduce((map, node) => {
					map[node.key] = node;
					return map;
				}, {});
			}

			var oSelectedNodeData = oNodeDataMap[sNodeKey];

			if (!oSelectedNodeData || !oSelectedNodeData.MaintenanceOrder) {
				MessageBox.error("Details not found for the selected node.");
				return;
			}

			// Find the original operation data from the 'operations' model for more details if needed
			var oOperationsModel = this.getView().getModel("operations");
			var aOperations = oOperationsModel.getData(); // Assuming it's an array
			var sOriginalOperation = sNodeKey.substring(sNodeKey.indexOf("_") + 1); // Extract original operation part
			var oSelectedOperation = aOperations.find(function (op) {
				return op.MaintenanceOrder === oSelectedNodeData.MaintenanceOrder && // Match Order AND...
				       op.MaintenanceOrderOperation === sOriginalOperation;       // ...Original Operation Key
			});


			if (!oSelectedOperation) {
				console.warn("Original operation details not found in 'operations' model for node key:", sNodeKey);
				// Fallback to data available directly in the node attributes if original operation is missing
				oSelectedOperation = {
					MaintenanceOrder: oSelectedNodeData.MaintenanceOrder,
					MaintenanceOrderOperation: oSelectedNodeData.attributes.find(a => a.label === "Operation")?.value || "N/A",
					OperationDescription: oSelectedNodeData.attributes.find(a => a.label.includes("Description"))?.value || "N/A",
					SystemStatusText: oSelectedNodeData.attributes.find(a => a.label === "Status")?.value || "N/A",
					WorkCenter: oSelectedNodeData.attributes.find(a => a.label === "Work Ctr")?.value || "N/A",
					OperationControlKey: oSelectedNodeData.attributes.find(a => a.label.includes("Ctrl Key"))?.value || "N/A",
					ControllingArea: oSelectedNodeData.attributes.find(a => a.label === "ControllingArea")?.value || "N/A",
					OperationWorkCenterTypeCode: oSelectedNodeData.attributes.find(a => a.label === "WorkCenterTypeCode")?.value || "N/A",
					ActualWorkQuantity: oSelectedNodeData.attributes.find(a => a.label === "ActualWorkQuantity")?.value || "N/A",
					MaintOrderConfirmation: oSelectedNodeData.attributes.find(a => a.label === "MaintOrderConfirmation")?.value || "N/A"
					// Add other relevant fields if available in attributes and needed
				};
			}

			// Create a model for the detail view (using data from original operation if found)
			var oDetailModel = new JSONModel(oSelectedOperation);

			// Set the model on the component to be accessible from the detail view (e.g., View2)
			this.getOwnerComponent().setModel(oDetailModel, "selectedOperation");

			// Navigate using Flexible Column Layout
			var oFCL = this._getFCL();
			if (oFCL) {
				oFCL.setLayout(fioriLibrary.LayoutType.TwoColumnsMidExpanded);
				// You might need to navigate to a specific route configured for the mid column
				// Example: this.oRouter.navTo("detail", { orderId: oSelectedOperation.MaintenanceOrder, operationId: oSelectedOperation.MaintenanceOrderOperation });
			}

			// Example: Store the node map for faster lookup in event handlers
			oGraphModel.setProperty("/_nodeDataMap", oNodeDataMap);
		},

		onGraphSelectionChange: function (oEvent) {
			var oGraph = this.byId("graph2");
			var aLines = oGraph.getAggregation("lines");
			var oSelectedLine = null;

			// Find the selected line
			for (var i = 0; i < aLines.length; i++) {
				if (aLines[i].getSelected() === true) {
					oSelectedLine = aLines[i];
					break;
				}
			}

			if (oSelectedLine) {
				// Get the FCL reference
				var oFCL = this._getFCL();
				if (!oFCL) {
					MessageBox.error("Navigation error: Could not access layout");
					return;
				}

				// Create line detail model with more detailed information
				var sMappedType = oSelectedLine.getTitle();
				
				// Get custom data from the line if available
				var oCustomData = {};
				var aCustomData = oSelectedLine.getCustomData();
				if (aCustomData && aCustomData.length > 0) {
					aCustomData.forEach(function(oData) {
						oCustomData[oData.getKey()] = oData.getValue();
					});
				}
				
				// Get node data from the graph model for better display names
				var oNodeDataMap = this.getView().getModel("graphicsData").getProperty("/nodes").reduce(function(map, node) {
					map[node.key] = node;
					return map;
				}, {});
				
				var oFromNode = oNodeDataMap[oSelectedLine.getFrom()];
				var oToNode = oNodeDataMap[oSelectedLine.getTo()];
				var sFromOpDisplay = oFromNode ? oFromNode.title : oSelectedLine.getFrom();
				var sToOpDisplay = oToNode ? oToNode.title : oSelectedLine.getTo();

				// Create and set the line detail model for the end column
				var oLineDetailModel = new JSONModel({
					from: oSelectedLine.getFrom(),
					to: oSelectedLine.getTo(),
					fromOp: sFromOpDisplay,
					toOp: sToOpDisplay,
					fromOrder: oFromNode ? oFromNode.MaintenanceOrder : "",
					toOrder: oToNode ? oToNode.MaintenanceOrder : "",
					typeMapped: sMappedType,
					typeOriginal: oCustomData.relationType || "",
					relationshipType: oCustomData.relationType || "",  // Added for RelationshipType field
					lineStyle: oSelectedLine.getStatus(), // Get the actual line style being used
					lineTypeFormatted: this.formatLineType(sMappedType),
					lineColorFormatted: this.formatLineColor(sMappedType)
				});
				this.getOwnerComponent().setModel(oLineDetailModel, "lineDetail");

				// Also populate the selectedOperation model with the "from" node details
				// This ensures the middle column shows valid node information
				if (oFromNode) {
					// Find the original operation data from the 'operations' model for more details
					var oOperationsModel = this.getView().getModel("operations");
					var aOperations = oOperationsModel.getData();
					var sFromNodeKey = oSelectedLine.getFrom();
					var sOriginalOperation = sFromNodeKey.substring(sFromNodeKey.indexOf("_") + 1);
					
					var oSelectedOperation = aOperations.find(function(op) {
						return op.MaintenanceOrder === oFromNode.MaintenanceOrder && 
							   op.MaintenanceOrderOperation === sOriginalOperation;
					});

					if (!oSelectedOperation) {
						console.warn("Original operation details not found in 'operations' model for line selection. Node key:", sFromNodeKey);
						// Create a more complete fallback object with all required fields
						oSelectedOperation = {
							MaintenanceOrder: oFromNode.MaintenanceOrder,
							MaintenanceOrderOperation: oFromNode.title.split(" / ")[1] || "",
							OperationDescription: oFromNode.attributes.find(a => a.label.includes("Description"))?.value || "N/A",
							SystemStatusText: oFromNode.attributes.find(a => a.label === "Status")?.value || "N/A",
							WorkCenter: oFromNode.attributes.find(a => a.label === "Work Ctr")?.value || "N/A",
							ControllingArea: "N/A", // Ensure these fields exist even if no data
							OperationWorkCenterTypeCode: "N/A",
							ActualWorkQuantity: "N/A",
							MaintOrderConfirmation: "N/A",
							OperationControlKey: oFromNode.attributes.find(a => a.label.includes("Ctrl Key"))?.value || "N/A",
							MaintenanceOrderRoutingNode: sOriginalOperation
						};
					} else {
						// Ensure all fields are present in the found operation
						if (!oSelectedOperation.ControllingArea) oSelectedOperation.ControllingArea = "N/A";
						if (!oSelectedOperation.OperationWorkCenterTypeCode) oSelectedOperation.OperationWorkCenterTypeCode = "N/A";
						if (!oSelectedOperation.ActualWorkQuantity) oSelectedOperation.ActualWorkQuantity = "N/A";
						if (!oSelectedOperation.MaintOrderConfirmation) oSelectedOperation.MaintOrderConfirmation = "N/A";
						if (!oSelectedOperation.MaintenanceOrderRoutingNode) oSelectedOperation.MaintenanceOrderRoutingNode = sOriginalOperation;
					}

					// Set the model for the detail view
					var oDetailModel = new JSONModel(oSelectedOperation);
					this.getOwnerComponent().setModel(oDetailModel, "selectedOperation");
				}

				// Set the FCL layout to show all three columns with focus on the end column
				oFCL.setLayout(fioriLibrary.LayoutType.ThreeColumnsMidExpanded);
			}
		},

		// Deprecated reverse mapping - Deletion now uses original type stored in custom data
		_getReverseRelationshipType: function (sGraphType) { /* Not needed if original type stored */ },

		// Map the OData type (NF, AF, etc.) to the display type (FS, SS, etc.)
		_mapRelationshipType: function (sOriginalType) {
			switch (sOriginalType) {
				case "NF": return "Finish-to-Start"; // Finish-to-Start (Normalfolge)
				case "AF": return "Start-to-Start"; // Start-to-Start (Anfangfolge)
				case "SF": return "Start-to-Finish"; // Start-to-Finish (Sprungfolge)
				case "EF": return "Finish-to-Finish"; // Finish-to-Finish (Endefolge)
				default:   return sOriginalType; // Fallback if unknown type
			}
		},

		// --- Formatters --- (Used in the XML View)

		formatLineType: function (sMappedType) { // sType is FS, SS, FF, SF
			const typeMap = {
				"Finish-to-Start": "Solid",   // Finish-to-Start
				"Start-to-Finish": "Dashed",  // Start-to-Finish
				"Start-to-Start": "Dotted",  // Start-to-Start
				"Finish-to-Finish": "Solid"    // Finish-to-Finish
			};
			return typeMap[sMappedType] || "Solid"; // Default
		},

		formatLineColor: function (sMappedType) { // sType is FS, SS, FF, SF
			const colorMap = {
				"Finish-to-Start": "#007DB6", // Blue
				"Start-to-Finish": "#E69A17", // Orange/Yellow
				"Start-to-Start": "#107E3E", // Green
				"Finish-to-Finish": "#B7083F"  // Magenta/Red
			};
			return colorMap[sMappedType] || "#666666"; // Default dark grey
		},
	});
});




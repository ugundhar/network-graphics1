sap.ui.define([
	"sap/ui/core/util/MockServer",
	"sap/ui/model/json/JSONModel",
	"sap/base/util/UriParameters",
	"sap/base/Log"
], function (MockServer, JSONModel, UriParameters, Log) {
	"use strict";

	var oMockServer,
		_sAppPath = "i2d/ps/networkgraph/",
		_sJsonFilesPath = _sAppPath + "localService/mockdata";

	var oMockServerInterface = {

		/**
		 * Initializes the mock server asynchronously.
		 * You can configure the delay with the URL parameter "serverDelay".
		 * The local mock data in this folder is returned instead of the real data for testing.
		 * @protected
		 * @param {object} [oOptionsParameter] init parameters for the mockserver
		 * @returns{Promise} a promise that is resolved when the mock server has been started
		 */
		init: function (oOptionsParameter) {
			var oOptions = oOptionsParameter || {};

			return new Promise(function (fnResolve, fnReject) {
				var sManifestUrl = sap.ui.require.toUrl(_sAppPath + "manifest.json"),
					oManifestModel = new JSONModel(sManifestUrl);

				oManifestModel.attachRequestCompleted(function () {
					var oUriParameters = new UriParameters(window.location.href),
						// parse manifest for local metatadata URI
						sJsonFilesUrl = sap.ui.require.toUrl(_sJsonFilesPath),
						oMainDataSource = oManifestModel.getProperty("/sap.app/dataSources/mainService"),
						sMetadataUrl = sap.ui.require.toUrl(_sAppPath + oMainDataSource.settings.localUri),
						// ensure there is a trailing slash
						sMockServerUrl = /.*\/$/.test(oMainDataSource.uri) ? oMainDataSource.uri : oMainDataSource.uri + "/";
					// ensure the URL to be relative to the application
					sMockServerUrl = sMockServerUrl && new URI(sMockServerUrl).absoluteTo(sap.ui.require.toUrl(_sAppPath)).toString();

					// create a mock server instance or stop the existing one to reinitialize
					if (!oMockServer) {
						oMockServer = new MockServer({
							rootUri: sMockServerUrl
						});
					} else {
						oMockServer.stop();
					}

					// configure mock server with the given options or a default delay of 0.5s
					MockServer.config({
						autoRespond: true,
						autoRespondAfter: 500
					});

					// simulate all requests using mock data
					oMockServer.simulate(sMetadataUrl, {
						sMockdataBaseUrl: sJsonFilesUrl,
						bGenerateMissingMockData: true
					});

					var aRequests = oMockServer.getRequests();
					aRequests.push({
						method: "GET",
						path: new RegExp("GetNetworkActivityNodeRelated(.*)"),
						response: function (oXhr, sUrlParams) {
							var aNetworkActivityRelSet = oMockServer._oMockdata.C_ProjectNetworkRelationship.find(function (oLine) {
								return oLine.GetNetworkActivityNodeRelated;
							}).GetNetworkActivityNodeRelated;
							var nStatus = oXhr.url.includes("ProjectExternalID='ERROR'") ? 400 : 200;
							oXhr.respondJSON(nStatus, {}, JSON.stringify({
								d: {
									results: aNetworkActivityRelSet
								}
							}));
						}
					});

					aRequests.push({
						method: "GET",
						path: new RegExp("SidePanelCounters(.*)"),
						response: function (oXhr, sUrlParams) {
							oXhr.respondJSON(200, {}, JSON.stringify({
								d: {
									SidePanelCounters: {
										DocumentCnt: 0,
										SubnetworkCnt: 0,
										ElementCnt: 0,
										MaterialCnt: 0,
										MilestoneCnt: 0
									}
								}
							}));
						}
					});

					aRequests.push({
						method: "GET",
						path: new RegExp("FindLoop(.*)"),
						response: function (oXhr, sUrlParams) {
							var aLoopLines = oMockServer._oMockdata.C_ProjectNetworkRelationship.find(function (oLine) {
								return oLine.FindLoop;
							}).FindLoop;
							oXhr.respondJSON(200, {}, JSON.stringify({
								d: {
									results: aLoopLines
								}
							}));
						}
					});
					
					aRequests.push({
						method: "GET",
						path: new RegExp("GetNetworkActivityRelationship(.*)"),
						response: function (oXhr, sUrlParams) {
							var aNetworkActivityRelSet = [{"__metadata":{"type":"PS_NETWORK_GRAPH_SRV.CT_NETWORK_ACTIVITY_RELATIONSHIP"},"ProjectNetworkInternalID":"0000081151","NetworkActivityInternalID":"00000003","ProjectNetwork":"4176506","NetworkActivity":"0030","SuccessorPredecessorIndicator":"P"},{"__metadata":{"type":"PS_NETWORK_GRAPH_SRV.CT_NETWORK_ACTIVITY_RELATIONSHIP"},"ProjectNetworkInternalID":"0000081151","NetworkActivityInternalID":"00000002","ProjectNetwork":"4176506","NetworkActivity":"0020","SuccessorPredecessorIndicator":"S"},{"__metadata":{"type":"PS_NETWORK_GRAPH_SRV.CT_NETWORK_ACTIVITY_RELATIONSHIP"},"ProjectNetworkInternalID":"0000081151","NetworkActivityInternalID":"00000004","ProjectNetwork":"4176506","NetworkActivity":"0040","SuccessorPredecessorIndicator":"P"},{"__metadata":{"type":"PS_NETWORK_GRAPH_SRV.CT_NETWORK_ACTIVITY_RELATIONSHIP"},"ProjectNetworkInternalID":"0000083645","NetworkActivityInternalID":"00000001","ProjectNetwork":"4180664","NetworkActivity":"0010","SuccessorPredecessorIndicator":"S"},{"__metadata":{"type":"PS_NETWORK_GRAPH_SRV.CT_NETWORK_ACTIVITY_RELATIONSHIP"},"ProjectNetworkInternalID":"0000081150","NetworkActivityInternalID":"00000001","ProjectNetwork":"4176505","NetworkActivity":"0010","SuccessorPredecessorIndicator":"S"}];
							oXhr.respondJSON(200, {}, JSON.stringify({
								d: {
									results: aNetworkActivityRelSet
								}
							}));
						}
					});

					oMockServer.attachAfter("GET", function (oEvent) {
						var oXhr = oEvent.getParameter("oXhr");
						if (oXhr && oXhr.url.indexOf("select") >= 0) {
							oEvent.getParameter("oFilteredData").results.push({
								"ProjectNetworkInternalID": "0000009582",
								"NetworkActivityInternalID": "00000001"
							});
						}
					}, "C_NtwkActivityGraphOverview");

					// compose an error response for each request
					var fnResponse = function (iErrCode, sMessage, aRequest) {
						aRequest.response = function (oXhr) {
							oXhr.respond(iErrCode, {
								"Content-Type": "text/plain;charset=utf-8"
							}, sMessage);
						};
					};

					// simulate metadata errors
					if (oOptions.metadataError || oUriParameters.get("metadataError")) {
						aRequests.forEach(function (aEntry) {
							if (aEntry.path.toString().indexOf("$metadata") > -1) {
								fnResponse(500, "metadata Error", aEntry);
							}
						});
					}

					// simulate request errors
					var sErrorParam = oOptions.errorType || oUriParameters.get("errorType"),
						iErrorCode = sErrorParam === "badRequest" ? 400 : 500;
					if (sErrorParam) {
						aRequests.forEach(function (aEntry) {
							fnResponse(iErrorCode, sErrorParam, aEntry);
						});
					}

					// custom mock behaviour may be added here

					// set requests and start the server
					oMockServer.setRequests(aRequests);
					oMockServer.start();

					Log.info("Running the app with mock data");
					fnResolve();
				});

				oManifestModel.attachRequestFailed(function () {
					var sError = "Failed to load application manifest";

					Log.error(sError);
					fnReject(new Error(sError));
				});
			});
		},

		/**
		 * @public returns the mockserver of the app, should be used in integration tests
		 * @returns {sap.ui.core.util.MockServer} the mockserver instance
		 */
		getMockServer: function () {
			return oMockServer;
		}
	};

	return oMockServerInterface;
});

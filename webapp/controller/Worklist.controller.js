sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, MessageBox) {
    "use strict";

    return BaseController.extend("renova.egitim2.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit: function () {
            var oViewModel;

            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText")
            });
            this.setModel(oViewModel, "worklistView");

        },
        onAfterRendering: function () {
            this.onGetData();
        },
        onGetData: function () {
            var that = this;
            this.getView().getModel().read("/EmployeeSet", {
                filters: null,
                async: true,
                success: function (oData) {
                    var aData = oData.results;
                    var oModel = new JSONModel(aData);
                    that.getView().setModel(oModel, "EmployeeModel")
                },
                error: function () {

                }
            });
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding's 'dataReceived' method.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
        },

        /**
         * Event handler when a table item gets pressed
         * @param {sap.ui.base.Event} oEvent the table selectionChange event
         * @public
         */
        onPress: function (oEvent) {
            // The source is the list item that got pressed
            //this._showObject(oEvent.getSource());
            var that = this;
            var sId = oEvent.getSource().getBindingContext("EmployeeModel").getProperty("Id");
            this.getView().getModel().read("/EmpRfcSet('" + sId + "')", {
                filters: null,
                async: true,
                success: function (oData) {
                    var sData = oData;
                    sData.isExist = true;
                    var oModel = new JSONModel(sData);
                    that.getView().setModel(oModel, "NewEmployeeModel");
                    that._getEmployeeDialog().open();
                    
                    //for upload
                    /*
                    var oAttachmentUpl = sap.ui.getCore().byId('attachmentUpl').getDefaultFileUploader();
                    oAttachmentUpl.setMultiple(true); //lets user select more than 1file at a time in their FileExplorer
                    */
                },
                error: function () {

                }
            });
        },
        onAddEmployee: function () {
            var oModel = new JSONModel({});
            this.getView().setModel(oModel, "NewEmployeeModel");
            this._getEmployeeDialog().open();
        },
        onSaveEmployee: function () {
            var that = this;
            var sEmployeeDetail = this.getView().getModel("NewEmployeeModel").getData();
            that.sId = sEmployeeDetail.Id;
            if (sEmployeeDetail.isExist) {
                delete sEmployeeDetail.isExist;
                this.getView().getModel().update("/EmployeeSet('" + that.sId + "')", sEmployeeDetail, {
                    success: function (oData) {
                        that.onGetData();
                        that.onStartUpload(that.sId);
                        that._getEmployeeDialog().close();
                    },
                    error: function () {

                    }
                });
            } else {
                var sParams = {
                    Id: sEmployeeDetail.Id,
                    Name: sEmployeeDetail.Name,
                    Surname: sEmployeeDetail.Surname,
                    Title: sEmployeeDetail.Title
                }

                this.getView().getModel().callFunction("/CreateEmp", {
                    method: "GET",
                    urlParameters: sParams,
                    async: true,
                    success: function (oData) {
                        var aData = oData.results;
                        var oModel = new JSONModel(aData);
                        that.getView().setModel(oModel, "EmployeeModel");
                        that.onStartUpload(that.sId);
                        that._getEmployeeDialog().close();
                    },
                    error: function () {

                    }
                });

                return;


                this.getView().getModel().create("/Employee2Set", sEmployeeDetail, {
                    success: function (oData) {
                        that.onGetData();
                        that._getEmployeeDialog().close();
                    },
                    error: function () {

                    }
                });
            }
        },
        _getEmployeeDialog: function () {
            this._oEmployeeDialog = sap.ui.getCore().byId("dialogEmployee");
            if (!this._oEmployeeDialog) {
                this._oEmployeeDialog = sap.ui.xmlfragment("renova.egitim2.fragments.Employee", this);
                this.getView().addDependent(this._oEmployeeDialog);
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oEmployeeDialog);
            }
            return this._oEmployeeDialog;
        },
        onDelete: function (oEvent) {
            var that = this;
            var sId = oEvent.getSource().getBindingContext("EmployeeModel").getProperty("Id");
            var sParams = {
                Id: sId
            };

            this.getView().getModel().callFunction("/DeleteEmployee", {
                method: "GET",
                urlParameters: sParams,
                async: true,
                success: function (oData) {
                    var aData = oData.results;
                    var oModel = new JSONModel(aData);
                    this.getView().setModel(oModel, "EmployeeModel")
                    //this.onGetData();
                }.bind(this),
                error: function () {

                }
            });

            return;
            this.getView().getModel().remove("/EmployeeSet('" + sId + "')", {
                success: function (oData, response) {
                    // response header
                    var hdrMessage = response.headers["sap-message"];
                    if (hdrMessage !== undefined) {
                        var hdrMessageObject = JSON.parse(hdrMessage);
                        if (hdrMessageObject.severity === 'error') {
                            hdrMessageObject.details.push({
                                code: hdrMessageObject.code,
                                message: hdrMessageObject.message,
                                severity: hdrMessageObject.severity
                            });
                            var oErrorHandler = that.getOwnerComponent()._oErrorHandler;
                            oErrorHandler._displayMessages(hdrMessageObject.details);
                            return;
                        }
                    }
                    that.onGetData();
                },
                error: function (a, b, c,) {

                }
            });
        },
        onApproveAllEmployee: function () {
            var sRequest = {
                OperationType: 'A',
                HeaderToEmployee: this.getView().getModel("EmployeeModel").getData()
            };
            this.getView().getModel().create("/Header2Set", sRequest, {
                success: function (oData) {
                    this.onGetData();
                }.bind(this),
                error: function () {

                }
            });
        },
        onShowProjects: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext("EmployeeModel").getProperty("Id");
            this.getView().getModel().read("/EmployeeSet('" + sId + "')", {
                async: true,
                urlParameters: {
                    "$expand": "EmployeeToProject"  
                },
                success: function (oData) {

                }.bind(this),
                error: function () {

                }
            });
        },
        onGetAllEmployeeAndProject: function () {
            this.getView().getModel().read("/EmployeeSet", {
                async: true,
                urlParameters: {
                    "$expand": "EmployeeToProject"
                },
                success: function (oData) {

                }.bind(this),
                error: function () {

                }
            });
        },
        onGetAllEmployeeAndProjectJson: function(){
            this.getView().getModel().callFunction("/GetEmployeeAndProject", {
                method: "POST",
                urlParameters: null,
                async: true,
                success: function (oData) {
                   var aData = JSON.parse(oData.GetEmployeeAndProject.Message);
                   var oModel = new JSONModel(aData);
                   this.getView().setModel(oModel, "EmployeeModel")
                }.bind(this),
                error: function () {

                }
            });
        },
        onApproveAllEmployeeJson: function(){
            var sRequest = {
                OperationType: 'A',
                HeaderToItem: this.getView().getModel("EmployeeModel").getData()
            };
            var sParams = {
                Content: JSON.stringify(sRequest)
            };
            this.getView().getModel().callFunction("/ApproveEmployee", {
                method: "GET",
                urlParameters: sParams,
                success: function (oData) {
                   
                }.bind(this),
                error: function () {

                }
            });
        },
        		/**
		 * Dosya yükleme işlemlerini başlatır
		 */
		onStartUpload: function () {
            var oModel = this.getView().getModel();
			var oFileUploader = sap.ui.getCore().byId("fileUploader");
			if (oFileUploader.getValue() === "") {
				//MessageToast.show("Please Choose any File");
			}

			oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "x-csrf-token",
				value: oModel.getSecurityToken()
			}));
            
  
			oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "X-Requested-With",
				value: "X"
			}));


			oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "content-disposition",
				value: encodeURIComponent(oFileUploader.getValue() ) + "#" + this.sId
			}));

			oFileUploader.upload(); 
            return;
            

			var oAttachmentUpl = sap.ui.getCore().byId("attachmentUpl");
			var aIncompleteItems = oAttachmentUpl.getIncompleteItems();
			this.iIncompleteItems = aIncompleteItems.length; //used to turn off busy indicator upon completion of all pending uploads
			if (this.iIncompleteItems !== 0) {
				oAttachmentUpl.setBusy(true);
				this.i = 0; //used to turn off busy indicator when all uploads complete
				for (var i = 0; i < this.iIncompleteItems; i++) {
					var sFileName = aIncompleteItems[i].getProperty("fileName");
					var oContentDisposition = new sap.ui.core.Item({
						key: "content-disposition",
						text: encodeURIComponent(sFileName) + "#" + this.sId
					});
					var oXCSRFToken = new sap.ui.core.Item({
						key: "x-csrf-token",
						text: this.getView().getModel().getSecurityToken()
					});
					var oSlug = new sap.ui.core.Item({
						key: "X-Requested-With",
						text: 'X'
					});
					oAttachmentUpl.addHeaderField(oContentDisposition).addHeaderField(oXCSRFToken).addHeaderField(oSlug).uploadItem(aIncompleteItems[i]);
					oAttachmentUpl.removeAllHeaderFields(); //at least slug header field must be reset after each upload
				}
				return;
			}
			//Show Complete Create Project Message
			this.onShowCompleteCreateProjectMssg();
		},
        /**
		 * Her dosya yükleme işlemi tammalanınca bu methoda düşer
		 * Dosya sayısı kadar düşünce de bitti pop-up verilir
		 */
		onUploadCompleted: function (a, b) {
			this.i += 1;
            this.onGetData();
			if (this.i === this.iIncompleteItems) { //turn off busy indicator when all attachments have completed uploading
				sap.ui.getCore().byId('attachmentUpl').setBusy(false);
				//Show Complete Create Project Message 
				this.onShowCompleteCreateProjectMssg();  
			}
		},
        		/**
		 * Proje kaydetme işlemi tamamlanınca pop-up mesajı çıkar
		 * Ardından ok butonuna basınca modeller sıfırlanır ve anasayfaya yönlendirilir
		 */
		onShowCompleteCreateProjectMssg: function () {
			var that = this;
			var sCompleteCreateProjectMssg = this.getResourceBundle().getText("completeCreateProjectMssg");
			MessageBox.success(sCompleteCreateProjectMssg, {
				actions: [MessageBox.Action.OK],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sAction) {

				}
			});
		},
        /**
         * Event handler for navigating back.
         * Navigate back in the browser history
         * @public
         */
        onNavBack: function () {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        },


        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any main list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = [new Filter("Name", FilterOperator.Contains, sQuery)];
                }
                this._applySearch(aTableSearchState);
            }

        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh: function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Shows the selected item on the object page
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showObject: function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getPath().substring("/EmployeeSet".length)
            });
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function (aTableSearchState) {
            var oTable = this.byId("table"),
                oViewModel = this.getModel("worklistView");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        }

    });
});

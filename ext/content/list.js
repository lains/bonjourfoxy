bonjourfoxy.list = {
    initialize: function()  {
        bonjourfoxy.lib.addUserPrefsObserver(bonjourfoxy.list);
        bonjourfoxy.lib.observerService().addObserver(bonjourfoxy.list, "BFServiceTracker_Change", false);
        document.getElementById("serviceListChildren").addEventListener("click", bonjourfoxy.list.listEventHandler, false);
        document.getElementById("targetmenu").addEventListener("popupshowing", bonjourfoxy.list.listEventHandler, false);
        document.getElementById("targetmenu").addEventListener("command", bonjourfoxy.list.listEventHandler, false);
        bonjourfoxy.list.treeView.init();
        bonjourfoxy.list.displaySidebarsearch();
    },
    shutdown: function () {
        bonjourfoxy.lib.rmvUserPrefsObserver(bonjourfoxy.list);
        bonjourfoxy.lib.observerService().removeObserver(bonjourfoxy.list, "BFServiceTracker_Change");
        bonjourfoxy.list.persistContainers();
    },
    observe: function(subject, topic, data) {
         if (topic == "BFServiceTracker_Change")    {
             // subtypes potentially add/remove services from "Websites"
            if (data != "website") {
                this.treeView.update("website");
            }
            this.treeView.update(data);
         }
        if (topic == "nsPref:changed")  {
            if (data == "sidebarsearch") {
                bonjourfoxy.list.displaySidebarsearch();
            }
        }
    },
    persistContainers: function()   {
        var opensbc = [];
        for (var i=0; i < bonjourfoxy.list.treeView.data.length; i++)  {
            if (bonjourfoxy.list.treeView.data[i].isOpen)    {
                opensbc.push(bonjourfoxy.list.treeView.data[i].intlabel);
            }
        }
        bonjourfoxy.lib.userPrefs().setCharPref("sidebarcontainers", opensbc.join("|"));
    },
    displaySidebarsearch: function()    {
        var searchbox = document.getElementById("search-box");
        if (bonjourfoxy.lib.userPrefs().getBoolPref("sidebarsearch"))   {
            searchbox.style.display = "";
        } else {
            searchbox.style.display = "none";
            searchbox.value = "";
            bonjourfoxy.list.search();
        }
    },
    listEventHandler: function(event) {
        var selected = document.getElementById('serviceList').currentIndex;
        if (selected == -1)   { event.preventDefault(); return; }
        var service = bonjourfoxy.list.treeView.data[selected];
        if (service.isContainer)   { event.preventDefault(); return; }
        if (event.type=='click' && event.button == 2) { return; }
        if (event.type=='popupshowing') { return; }
        var linkTarget = "default";
        if (event.type == 'command')  {
            linkTarget=event.target.value;
        } else {
            if (event.shiftKey) {
                linkTarget="window";
            }
            if (event.button=="1") {
                linkTarget="tab";
            }
        }
        var b = Object();
        var resolverContext = Object();
        resolverContext.resolved = false;
        resolverContext.label = service.label;
        resolverContext.target = linkTarget;
        resolverContext.resolver = bonjourfoxy.lib.DNSSDService().resolve(0, service.name, "_http._tcp.", service.domain, function(service, interfaceIndex, error, fqdn, hostname, port, keyValues) {
            var pathValue = "";
            var pathMatch = /^path=(.*)$/;
            for (var i = 0; i < keyValues.length; i++) {
                var keyValue = keyValues.queryElementAt(i, Components.interfaces.nsIVariant);
                var pathMatches = pathMatch(keyValue);
                if (pathMatches != null) {
                    if (pathMatches[1]) {
                        pathValue = pathMatches[1];
			break;
                    }
                }
            }
            var rc = resolverContext;
            if(!rc.resolved) {
                hostname = hostname.charAt(hostname.length-1) == "." ? hostname.substr(0, hostname.length-1) : hostname;
                var path = pathValue.charAt(0) == '/' ? pathValue : '/' + pathValue;
                bonjourfoxy.lib.openLink(["http://", hostname, ':', port, path].join(""), rc.target);
            }
            rc.resolved = true;
            rc.resolver = null;
            service.stop();
        });
        window.setTimeout(function() {
            var rc = resolverContext;
            if (!rc.resolved)    {
                bonjourfoxy.lib.dialog("Timeout", "Timed out trying to resolve " + rc.label);
            }
            try { rc.resolver.stop(); }
            catch (e) {}
        }, 15000);
    },
    search: function() {
        var categories = bonjourfoxy.lib.ServiceTracker().getCategories();
        for (var i=0; i<categories.length; i++)    {
            var category = categories.queryElementAt(i, Components.interfaces.nsIVariant);
            bonjourfoxy.list.treeView.update(category);
        }
    },
    treeView: {
        getServices: function(category) {
            var services = [];
            var rawServices = bonjourfoxy.lib.ServiceTracker().getServices(category);
            var filter = document.getElementById("search-box").value;
            for (var i = 0; i < rawServices.length; i++)   {
                var rawService = rawServices.queryElementAt(i, Components.interfaces.nsIArray);
                var name = rawService.queryElementAt(0, Components.interfaces.nsIVariant);
                var domain = rawService.queryElementAt(1, Components.interfaces.nsIVariant);
                var label = name + " (" + domain + ")";
                if (label.indexOf(filter) !=-1)   {
                    services.push({
                        isContainer: false,
                        isOpen: false,
                        label: label,
                        name: name,
                        domain: domain,
                    });
                }
            }
            return services;
        },
        emptyContainer: function (idx) {
            if (!this.isContainer(idx))  {
                bonjourfoxy.lib.log("Item " + idx + " is not a container");
                return;
            }
            var thisLevel = this.getLevel(idx);
            var deletecount = 0;
            for (var i = idx + 1; i < this.data.length; i++)    {
                if (this.getLevel(i) > thisLevel) {
                    deletecount++;
                } else {
                    break;
                }
            }
            if (deletecount) {
                this.data.splice(idx + 1, deletecount);
                this.treeBox.rowCountChanged(idx + 1, -deletecount);
            }
        },
        populateContainer: function(idx) {
            if (!this.isContainer(idx))  {
                bonjourfoxy.lib.log("Item " + idx + " is not a container");
                return;
            }
            var category = this.data[idx].intlabel;
            var toinsert = this.getServices(category);
            for (var i=0; i < toinsert.length; i++)   {
                this.data.splice(idx + i + 1, 0, toinsert[i]);
            }
            this.treeBox.rowCountChanged(idx + 1, toinsert.length);
        },
        init: function()    {
            var categories = bonjourfoxy.lib.ServiceTracker().getCategories();
            for (var i=0; i < categories.length; i++)    {
                var intlabel = categories.queryElementAt(i,Components.interfaces.nsIVariant);
                var uilabel = bonjourfoxy.lib.uistring("serviceLabel_" + intlabel);
                this.data.push({
                    label: uilabel,
                    intlabel: intlabel,
                    isContainer: true,
                    isOpen: false,
                });
                document.getElementById("serviceList").view = bonjourfoxy.list.treeView;
            }
            var opensbcO = {};
            var opensbcA = bonjourfoxy.lib.userPrefs().getCharPref("sidebarcontainers").split("|");
            if (typeof(opensbcA)==typeof("")) { opensbcA = [opensbcA]; }
            for (i=0; i<opensbcA.length; i++)   {
                opensbcO[opensbcA[i]] = true;
            }
            for (i=0; i < this.data.length; i++)    {
                if (!this.data[i].isContainer) { continue; }
                if (opensbcO[this.data[i].intlabel])   {
                    this.toggleOpenState(i);
                }
            }
        },
        update: function(category) {
            if (category == null) { return; }
            // find the idx
            var categoryIdx = -1;
            for (var i=0; i < this.data.length; i++)  {
                var item = this.data[i];
                if (item.isContainer && item.intlabel == category) {
                    if (!item.isOpen)   { return; }
                    categoryIdx = i;
                    break;
                }
            }
            if (categoryIdx == -1) { 
                bonjourfoxy.lib.log("Could not find idx of category " + category);
                return;
            }
            var firstVisibleRow = this.treeBox.getFirstVisibleRow();
            this.treeBox.beginUpdateBatch();
            this.emptyContainer(categoryIdx);
            this.populateContainer(categoryIdx);
            this.treeBox.invalidateRow(categoryIdx);
            this.treeBox.endUpdateBatch();
            this.treeBox.ensureRowIsVisible(this.data.length > firstVisibleRow ? firstVisibleRow : this.data.length);
        },
        data : [],
        treeBox: null,
        selection: null,
        get rowCount()                     { return this.data.length; },
        setTree: function(treeBox)         { this.treeBox = treeBox; },
        getCellText: function(idx, column) { return this.data[idx].label; },
        isContainer: function(idx)         { return this.data[idx].isContainer; },
        isContainerOpen: function(idx)     { return this.data[idx].isOpen; },
        isContainerEmpty: function(idx)    {
            var bfSt = bonjourfoxy.lib.ServiceTracker();
            return bfSt.countServices(this.data[idx].intlabel) == 0;
        },
        isSeparator: function(idx)         { return false; },
        isSorted: function()               { return false; },
        isEditable: function(idx, column)  { return false; },
        
        getParentIndex: function(idx) {
            if (this.isContainer(idx)) return -1;
            for (var t = idx - 1; t >= 0 ; t--) {
              if (this.isContainer(t)) return t;
            }
        },
        getLevel: function(idx) {
            return this.isContainer(idx) ? 0:1;
        },
        hasNextSibling: function(idx, after) {
            var thisLevel = this.getLevel(idx);
            for (var t = after + 1; t < this.data.length; t++) {
              var nextLevel = this.getLevel(t);
              if (nextLevel == thisLevel) return true;
              if (nextLevel < thisLevel) break;
            }
            return false;
        },
        toggleOpenState: function(idx) {
            if (!this.isContainer(idx)) return;
            if (this.isContainerOpen(idx))  {
                this.data[idx].isOpen = false;
                this.emptyContainer(idx);
            } else {
                this.data[idx].isOpen = true;
                this.populateContainer(idx);
            }
            this.treeBox.invalidateRow(idx);
            bonjourfoxy.list.persistContainers();
        },
        getImageSrc: function(idx, column) {},
        getProgressMode : function(idx,column) {},
        getCellValue: function(idx, column) {},
        cycleHeader: function(col, elem) {},
        selectionChanged: function() {},
        cycleCell: function(idx, column) {},
        performAction: function(action) {},
        performActionOnCell: function(action, index, column) {},
        getRowProperties: function(idx, column, prop) {},
        getCellProperties: function(idx, column, prop) {},
        getColumnProperties: function(column, element, prop) {},
    }
};
window.addEventListener("load", bonjourfoxy.list.initialize, false);
window.addEventListener("unload", bonjourfoxy.list.shutdown, false);

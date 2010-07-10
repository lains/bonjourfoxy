bonjourfoxy.browser = {
    initialize: function() {
        bonjourfoxy.browser.dnssd = bonjourfoxy.lib.DNSSDService();
        bonjourfoxy.browser.add("_services._dns-sd._udp", bonjourfoxy.browser.regtypesListener);
    },
    shutdown: function() {
        for (regtype in bonjourfoxy.browser.dnssd_instances)    {
            try { bonjourfoxy.browser.dnssd_instances[regtype].stop(); }
            catch (e) {}
        }
        try { bonjourfoxy.browser.resolverContext.stop(); }
        catch (e) {}
    },
    dnssd_instances: Object(),
    add: function(regtype, listener) {
        bonjourfoxy.browser.dnssd_instances[regtype] = bonjourfoxy.browser.dnssd.browse(0, regtype, "", listener);
    },
    regtypesListener: function(service, add, interfaceIndex, error, serviceName, regtype, domain) {
        if (!error && add) {
            var newregtype = serviceName + '.' + regtype.split(".")[0];
            if (!bonjourfoxy.browser.dnssd_instances[newregtype]) {
                bonjourfoxy.browser.add(newregtype, bonjourfoxy.browser.instanceListener);
            }
        }
    },
    instanceListener: function(service, add, interfaceIndex, error, serviceName, regtype, domain) {
        if (!error) {
            var itemid = ["listitem", interfaceIndex, serviceName, regtype, domain].join("");
            if (add) {
                var newListItem = document.createElement('listitem');
                var newLabelInterface = document.createElement('label');
                var newLabelDomain = document.createElement('label');
                var newLabelRegistrationType = document.createElement('label');
                var newLabelServiceName = document.createElement('label');
                newLabelInterface.setAttribute('value', interfaceIndex);
                newLabelDomain.setAttribute('value', domain);
                newLabelRegistrationType.setAttribute('value', regtype);
                newLabelServiceName.setAttribute('value', serviceName);
                newListItem.appendChild(newLabelInterface);
                newListItem.appendChild(newLabelServiceName);
                newListItem.appendChild(newLabelRegistrationType);
                newListItem.appendChild(newLabelDomain);
                newListItem.setUserData("interfaceIndex", interfaceIndex, null);
                newListItem.setUserData("serviceName", serviceName, null);
                newListItem.setUserData("regtype", regtype, null);
                newListItem.setUserData("domain", domain, null);
                newListItem.setAttribute("id", itemid);
                document.getElementById('lbServices').appendChild(newListItem);
            } else {
                var rmElement = document.getElementById(itemid);
                document.getElementById('lbServices').removeChild(rmElement);
            }
        }
    },
    resolveService: function(event) {
        var listitem = event.explicitOriginalTarget;
        var interfaceIndex = listitem.getUserData("interfaceIndex");
        var serviceName = listitem.getUserData("serviceName");
        var domain = listitem.getUserData("domain");
        var regtype = listitem.getUserData("regtype");
        bonjourfoxy.browser.resolverContext = Object();
        bonjourfoxy.browser.resolverContext.serviceName = serviceName;
        bonjourfoxy.browser.resolverContext.regtype = regtype;
        bonjourfoxy.browser.resolverContext.domain = domain;
        bonjourfoxy.browser.resolverContext.resolved = false;
        try { bonjourfoxy.browser.resolver.stop(); }
        catch (e) {}
        bonjourfoxy.browser.resolver = bonjourfoxy.browser.dnssd.resolve(interfaceIndex, serviceName, regtype, domain, bonjourfoxy.lib.callInContext(bonjourfoxy.browser.resolveListener));
        try { window.clearTimeout(bonjourfoxy.browser.resolverTimer); }
        catch (e) {}
        bonjourfoxy.browser.resolverTimer = window.setTimeout(function(){
            if (!bonjourfoxy.browser.resolverContext.resolved)   {
                bonjourfoxy.browser.resolver.stop();
                bonjourfoxy.lib.dialog("Timeout", "Timed out resolving service");
            }
        }, 30000);
    },
    resolveListener: function(service, interfaceIndex, error, fqdn, hostname, port, keyValues) {
        if (!error) {
            bonjourfoxy.browser.resolverContext.resolved = true;
            var txt = ""
            for (var i = 0; i < keyValues.length; i++) {
                var keyValue = keyValues.queryElementAt(i, Components.interfaces.nsIVariant);
                txt += keyValue + "\n";
            }
            document.getElementById('tbInterfaceIndex').setAttribute('value', interfaceIndex);
            document.getElementById('tbServiceName').setAttribute('value', bonjourfoxy.browser.resolverContext.serviceName);
            document.getElementById('tbRegistrationType').setAttribute('value', bonjourfoxy.browser.resolverContext.regtype);
            document.getElementById('tbRegistrationDomain').setAttribute('value', bonjourfoxy.browser.resolverContext.domain);
            document.getElementById('tbHost').setAttribute('value', hostname);
            document.getElementById('tbPort').setAttribute('value', port);
            document.getElementById('tbTextRecords').setAttribute('value', txt);
            document.getElementById('gpServiceInfo').setAttribute('style','');
        }
    }
}
window.addEventListener("load", bonjourfoxy.browser.initialize, false);
window.addEventListener("unload", bonjourfoxy.browser.shutdown, false);
